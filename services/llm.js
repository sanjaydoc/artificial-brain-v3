// Artificial Brain v3 — Multi-provider LLM client with circuit breaker.
// Adapted from v1's services/llm.js with added vision role for moondream.
//
//   Provider chain: OpenRouter → NVIDIA → Ollama Tunnel → Ollama Local
//   Brain roles:    reasoning (prefrontal), language (broca), embed (wernicke), vision (visual cortex)
//
// Use: import { chat, embed, getLlmStatus } from './services/llm.js'

import axios from 'axios'

// ─────────────────────────────────────────────────────────────────────────────
// Provider config
// ─────────────────────────────────────────────────────────────────────────────
function normalizeBase(u) {
  if (!u) return ''
  return String(u).replace(/\/+$/, '').replace(/\/v1$/, '')
}

const PROVIDERS = {
  openrouter: {
    chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
    embedUrl: 'https://openrouter.ai/api/v1/embeddings',
    apiKey: () => process.env.OPENROUTER_API_KEY,
    extraHeaders: () => ({
      'HTTP-Referer': 'https://klabs.network',
      'X-Title': 'Artificial-Brain-v3',
    }),
    embedDim: 1536,
  },
  nvidia: {
    chatUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    embedUrl: 'https://integrate.api.nvidia.com/v1/embeddings',
    apiKey: () => process.env.NVIDIA_API_KEY,
    extraHeaders: () => ({}),
    embedDim: 1024,
  },
  ollamaTunnel: {
    get chatUrl() {
      const b = normalizeBase(process.env.OLLAMA_TUNNEL_URL)
      return b ? `${b}/v1/chat/completions` : ''
    },
    get embedUrl() {
      const b = normalizeBase(process.env.OLLAMA_TUNNEL_URL)
      return b ? `${b}/v1/embeddings` : ''
    },
    apiKey: () => 'tunnel-via-caddy-gate',
    extraHeaders: () => {
      const t = process.env.OLLAMA_TUNNEL_AUTH_TOKEN
      return t ? { 'X-Auth-Token': t } : {}
    },
    embedDim: 768,
  },
  ollamaLocal: {
    get chatUrl() {
      const b = normalizeBase(process.env.OLLAMA_LOCAL_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434')
      return b ? `${b}/v1/chat/completions` : ''
    },
    get embedUrl() {
      const b = normalizeBase(process.env.OLLAMA_LOCAL_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434')
      return b ? `${b}/v1/embeddings` : ''
    },
    apiKey: () => 'localhost-no-auth-needed',
    extraHeaders: () => ({}),
    embedDim: 768,
  },
}

// Brain-specific model roles
const OLLAMA_REASONING = process.env.OLLAMA_REASONING_MODEL || 'qwen2.5:7b'
const OLLAMA_LANGUAGE  = process.env.OLLAMA_LANGUAGE_MODEL  || 'llama3.2:3b'
const OLLAMA_EMBED     = process.env.OLLAMA_EMBED_MODEL     || 'nomic-embed-text:latest'
const OLLAMA_VISION    = process.env.OLLAMA_VISION_MODEL    || 'moondream:latest'
const OLLAMA_CODER     = process.env.OLLAMA_CODER_MODEL     || 'qwen2.5-coder:7b'

const MODELS = {
  reasoning: {
    openrouter:   process.env.OPENROUTER_REASONING_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    nvidia:       process.env.NVIDIA_REASONING_MODEL     || 'meta/llama-3.3-70b-instruct',
    ollamaTunnel: process.env.OLLAMA_TUNNEL_REASONING_MODEL || OLLAMA_REASONING,
    ollamaLocal:  process.env.OLLAMA_LOCAL_REASONING_MODEL  || OLLAMA_REASONING,
  },
  language: {
    openrouter:   process.env.OPENROUTER_LANGUAGE_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    nvidia:       process.env.NVIDIA_LANGUAGE_MODEL     || 'meta/llama-3.3-70b-instruct',
    ollamaTunnel: process.env.OLLAMA_TUNNEL_LANGUAGE_MODEL || OLLAMA_LANGUAGE,
    ollamaLocal:  process.env.OLLAMA_LOCAL_LANGUAGE_MODEL  || OLLAMA_LANGUAGE,
  },
  vision: {
    ollamaTunnel: process.env.OLLAMA_TUNNEL_VISION_MODEL || OLLAMA_VISION,
    ollamaLocal:  process.env.OLLAMA_LOCAL_VISION_MODEL  || OLLAMA_VISION,
  },
  coder: {
    openrouter:   process.env.OPENROUTER_CODER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    ollamaTunnel: process.env.OLLAMA_TUNNEL_CODER_MODEL || OLLAMA_CODER,
    ollamaLocal:  process.env.OLLAMA_LOCAL_CODER_MODEL  || OLLAMA_CODER,
  },
  embed: {
    openrouter:   process.env.OPENROUTER_EMBED_MODEL || 'openai/text-embedding-3-small',
    ollamaTunnel: process.env.OLLAMA_TUNNEL_EMBED_MODEL || OLLAMA_EMBED,
    ollamaLocal:  process.env.OLLAMA_LOCAL_EMBED_MODEL  || OLLAMA_EMBED,
  },
}

const PROVIDER_ORDER = (
  process.env.LLM_PROVIDER_ORDER || 'openrouter,nvidia,ollamaTunnel,ollamaLocal'
).split(',').map(s => s.trim()).filter(s => s in PROVIDERS)

// ─────────────────────────────────────────────────────────────────────────────
// Circuit breaker
// ─────────────────────────────────────────────────────────────────────────────
const FAIL_THRESHOLD = Number(process.env.LLM_FAIL_THRESHOLD || 3)
const COOLDOWN_MS    = Number(process.env.LLM_COOLDOWN_MS || 5 * 60 * 1000)
const breakers = new Map()

function shouldSkip(provider) {
  const b = breakers.get(provider)
  if (!b) return false
  if (b.failCount < FAIL_THRESHOLD) return false
  if (Date.now() - b.openedAt < COOLDOWN_MS) return true
  breakers.delete(provider)
  return false
}

function recordFailure(provider, err) {
  const prev = breakers.get(provider) || { failCount: 0 }
  breakers.set(provider, { failCount: prev.failCount + 1, openedAt: Date.now(), lastError: err?.message || String(err) })
}

function recordSuccess(provider) { breakers.delete(provider) }

function isFailoverError(err) {
  if (!err) return true
  if (['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN'].includes(err.code)) return true
  const status = err.response?.status
  if (!status) return true
  if (status === 400 || status === 401 || status === 403) return false
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: chat
// ─────────────────────────────────────────────────────────────────────────────
async function chatOnce(messages, opts) {
  const { role = 'language', maxTokens = 500, temperature = 0.7, jsonMode = false } = opts
  let lastErr = null

  for (const p of PROVIDER_ORDER) {
    if (shouldSkip(p)) continue
    const cfg = PROVIDERS[p]
    if (!cfg.apiKey()) continue
    if (!cfg.chatUrl) continue
    const model = MODELS[role]?.[p]
    if (!model) continue

    const t0 = Date.now()
    try {
      const body = { model, messages, max_tokens: maxTokens, temperature }
      if (jsonMode) body.response_format = { type: 'json_object' }

      const r = await axios.post(cfg.chatUrl, body, {
        headers: { Authorization: `Bearer ${cfg.apiKey()}`, 'Content-Type': 'application/json', ...cfg.extraHeaders() },
        timeout: 90_000,
      })

      const content = r.data?.choices?.[0]?.message?.content ?? ''
      recordSuccess(p)
      return { ok: true, content, provider: p, model, elapsedMs: Date.now() - t0 }
    } catch (err) {
      lastErr = err
      if (!isFailoverError(err)) throw err
      recordFailure(p, err)
    }
  }
  return { ok: false, lastErr }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * @param {Array<{role:string,content:string}>} messages
 * @param {{ role?: string, maxTokens?: number, temperature?: number, jsonMode?: boolean }} opts
 * @returns {Promise<string>} The LLM reply content
 */
export async function chat(messages, opts = {}) {
  const BACKOFFS = [3000, 8000]
  let result = await chatOnce(messages, opts)
  if (result.ok) return result.content

  for (const ms of BACKOFFS) {
    await sleep(ms)
    result = await chatOnce(messages, opts)
    if (result.ok) return result.content
  }

  const lastErr = result.lastErr
  const reason = lastErr?.response
    ? `HTTP ${lastErr.response.status}: ${JSON.stringify(lastErr.response.data).slice(0, 300)}`
    : lastErr?.message || 'no providers available'
  throw new Error(`All LLM providers exhausted — ${reason}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: embed
// ─────────────────────────────────────────────────────────────────────────────
export async function embed(input) {
  let lastErr = null
  const inputs = Array.isArray(input) ? input : [input]

  for (const p of PROVIDER_ORDER) {
    if (shouldSkip(p)) continue
    const cfg = PROVIDERS[p]
    if (!cfg.apiKey()) continue
    if (!cfg.embedUrl) continue
    const model = MODELS.embed?.[p]
    if (!model) continue

    try {
      const r = await axios.post(cfg.embedUrl, { model, input: inputs }, {
        headers: { Authorization: `Bearer ${cfg.apiKey()}`, 'Content-Type': 'application/json', ...cfg.extraHeaders() },
        timeout: 60_000,
      })
      const data = r.data?.data || []
      const embeddings = data.map(d => d.embedding || [])
      recordSuccess(p)
      // Return flat array for single input, array of arrays for batch
      return inputs.length === 1 ? embeddings[0] : embeddings
    } catch (err) {
      lastErr = err
      if (!isFailoverError(err)) throw err
      recordFailure(p, err)
    }
  }
  throw new Error(`Embedding failed — ${lastErr?.message || 'no providers'}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: status
// ─────────────────────────────────────────────────────────────────────────────
export function getLlmStatus() {
  const status = {}
  for (const p of Object.keys(PROVIDERS)) {
    const cfg = PROVIDERS[p]
    const b = breakers.get(p)
    status[p] = {
      configured: !!cfg.apiKey() && !!cfg.chatUrl,
      models: Object.fromEntries(Object.entries(MODELS).map(([role, m]) => [role, m[p] || null])),
      circuit: b
        ? { open: b.failCount >= FAIL_THRESHOLD, failCount: b.failCount, lastError: b.lastError }
        : { open: false, failCount: 0 },
    }
  }
  return { providerOrder: PROVIDER_ORDER, activeOrder: PROVIDER_ORDER.filter(p => status[p].configured), providers: status }
}
