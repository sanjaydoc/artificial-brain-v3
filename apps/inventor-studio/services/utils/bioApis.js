// Cell therapy / biology API helpers — ported from ASI-1 src/config/bioApis.ts.
// Two functions:
//   callEvo2(prompt) — DNA sequence generation via NVIDIA NIM EVO 2 40B
//                      → fallback HuggingFace BioMistral-7B
//   callESM3(prompt) — protein design via EvolutionaryScale forge ESM-3
//                      → fallback HuggingFace Rostlab/prot_bert
// Both return '' if every source fails (so caller can degrade gracefully).

import axios from 'axios'

const NIM_BIO_BASE = 'https://health.api.nvidia.com/v1/biology'
const HF_BASE      = 'https://api-inference.huggingface.co/models'
const ESM_BASE     = 'https://forge.evolutionaryscale.ai'
const TIMEOUT_MS   = 90_000

// ── EVO 2 ─────────────────────────────────────────────────────────────────────
// Short OCT4/POU5F1 exon-1 context — fallback DNA seed when caller passes text
const OCT4_DNA_SEED =
  'ATGGCGGGACACCTGGCTTCGGATTTCGCCTTCGAGAAGGTGCAGCAAAAGAAGAGCAAGGATGCAGAGCTG' +
  'CAGAGAGAGAGGCGCAATTTCTGGAGCAGTTTGCAGGAGCACGAGTGGAAAGCAACTCAGAGCGATTTGGCC'

function toValidDna(input) {
  const cleaned = String(input || '').toUpperCase().replace(/[^ACGT]/g, '')
  return cleaned.length >= 20 ? cleaned.slice(0, 1000) : OCT4_DNA_SEED
}

export async function callEvo2(prompt) {
  // Tier 1: NVIDIA NIM EVO 2 40B
  if (process.env.NVIDIA_API_KEY) {
    try {
      const sequence = toValidDna(prompt)
      const { data } = await axios.post(
        `${NIM_BIO_BASE}/arc/evo2-40b/generate`,
        {
          sequence,
          num_tokens: 256,
          temperature: 0.5,
          top_k: 4,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: TIMEOUT_MS,
        },
      )
      const result =
        data?.sequence ??
        data?.generated_sequence ??
        (Array.isArray(data?.outputs) ? data.outputs[0]?.sequence : null) ??
        data?.output ??
        ''
      if (result) {
        console.log('[EVO2] NIM 40B succeeded')
        return `Generated DNA sequence (EVO 2): ${result}`
      }
    } catch (err) {
      console.warn('[EVO2] NIM failed:', err?.response?.status, err?.message)
    }
  }

  // Tier 2: HuggingFace BioMistral-7B (text-gen biology LLM)
  if (process.env.HF_API_TOKEN) {
    try {
      const { data } = await axios.post(
        `${HF_BASE}/BioMistral/BioMistral-7B`,
        { inputs: String(prompt || '').slice(0, 600), parameters: { max_new_tokens: 300, temperature: 0.3 } },
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: TIMEOUT_MS,
        },
      )
      const full = Array.isArray(data) ? (data[0]?.generated_text ?? '') : (data?.generated_text ?? '')
      const inputLen = String(prompt || '').length
      const result = full.length > inputLen ? full.slice(inputLen).trim() : full
      if (result) {
        console.log('[EVO2] BioMistral-7B fallback succeeded')
        return result
      }
    } catch (err) {
      console.warn('[EVO2] HuggingFace fallback failed:', err?.response?.status, err?.message)
    }
  }

  console.warn('[EVO2] All sources exhausted — proceeding without EVO 2 analysis')
  return ''
}

// ── ESM-3 ─────────────────────────────────────────────────────────────────────
// 50-residue OCT4 anchor + masked tail — ESM-3 fills the underscores
const OCT4_MASKED = 'MAGHLASDFAFS' + '_'.repeat(38)
const AA_CHARS = new Set('ACDEFGHIKLMNPQRSTVWYX')

function toEsmSequence(input) {
  const s = String(input || '')
  const hasMasks = s.includes('_')
  if (hasMasks) {
    const cleaned = s.toUpperCase().split('').filter((c) => AA_CHARS.has(c) || c === '_').join('')
    if (cleaned.length >= 10) return cleaned.slice(0, 400)
  }
  return OCT4_MASKED
}

export async function callESM3(prompt) {
  // Tier 1: EvolutionaryScale forge ESM-3
  if (process.env.ESM_API_KEY) {
    try {
      const sequence = toEsmSequence(prompt)
      const { data } = await axios.post(
        `${ESM_BASE}/api/v1/generate`,
        {
          model: 'esm3-open',
          inputs: {
            sequence,
            secondary_structure: null,
            sasa: null,
            function: null,
            coordinates: null,
          },
          track: 'sequence',
          invalid_ids: [],
          schedule: 'cosine',
          num_steps: 8,
          temperature: 0.7,
          top_p: 1.0,
          condition_on_coordinates_only: false,
          strategy: 'entropy',
          temperature_annealing: false,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.ESM_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: TIMEOUT_MS,
        },
      )
      const result =
        data?.outputs?.sequence ??
        data?.outputs?.[0]?.sequence ??
        data?.output?.sequence ??
        (typeof data?.outputs === 'string' ? data.outputs : '') ??
        ''
      if (result) {
        console.log('[ESM3] forge succeeded')
        return `Designed protein sequence (ESM-3): ${result}`
      }
    } catch (err) {
      console.warn('[ESM3] forge failed:', err?.response?.status, err?.message)
      if (err?.response?.data) {
        console.warn('[ESM3] body:', JSON.stringify(err.response.data).slice(0, 500))
      }
    }
  }

  // Tier 2: HuggingFace Rostlab/prot_bert (deployed protein LM)
  if (process.env.HF_API_TOKEN) {
    try {
      const { data } = await axios.post(
        `${HF_BASE}/Rostlab/prot_bert`,
        { inputs: toEsmSequence(prompt) },
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: TIMEOUT_MS,
        },
      )
      const result = `ESM-2 representation: ${JSON.stringify(data).slice(0, 300)}`
      console.log('[ESM3] prot_bert fallback succeeded')
      return result
    } catch (err) {
      console.warn('[ESM3] HuggingFace fallback failed:', err?.response?.status, err?.message)
    }
  }

  console.warn('[ESM3] All sources exhausted — proceeding without protein analysis')
  return ''
}
