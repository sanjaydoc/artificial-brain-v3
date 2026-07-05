// Multi-provider LLM client with circuit breaker.
// Ported from sentiance/services/llm.js — same 4-tier fallback chain:
//   • Chat (reasoning|agent role): OpenRouter → NVIDIA → Ollama-tunnel → Ollama-localhost
//   • Embeddings: OpenRouter only (Atlas vector index has FIXED dim — no silent
//     fallover, fail loud).
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
      'HTTP-Referer': 'https://inventorstudio.xyz',
      'X-Title': 'Inventor Studio',
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
  // Tier 3: self-hosted Ollama exposed via Cloudflare Tunnel.
  // Used in production when no localhost Ollama (cPanel/inventorstudio.xyz).
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
  // Tier 4: localhost Ollama. Active only on dev machines / locally-hosted boxes.
  // Backward-compat: also picks up the older OLLAMA_BASE_URL.
  ollamaLocal: {
    get chatUrl() {
      const b = normalizeBase(process.env.OLLAMA_LOCAL_URL || process.env.OLLAMA_BASE_URL)
      return b ? `${b}/v1/chat/completions` : ''
    },
    get embedUrl() {
      const b = normalizeBase(process.env.OLLAMA_LOCAL_URL || process.env.OLLAMA_BASE_URL)
      return b ? `${b}/v1/embeddings` : ''
    },
    apiKey: () => 'localhost-no-auth-needed',
    extraHeaders: () => ({}),
    embedDim: 768,
  },
}

const OLLAMA_REASONING = process.env.OLLAMA_REASONING_MODEL || 'qwen2.5:7b'
const OLLAMA_AGENT = process.env.OLLAMA_AGENT_MODEL || 'llama3.2:3b'
const OLLAMA_EMBED = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text:latest'

const MODELS = {
  reasoning: {
    openrouter:
      process.env.OPENROUTER_REASONING_MODEL ||
      'meta-llama/llama-3.3-70b-instruct:free',
    nvidia: process.env.NVIDIA_REASONING_MODEL || 'meta/llama-3.3-70b-instruct',
    ollamaTunnel: process.env.OLLAMA_TUNNEL_REASONING_MODEL || OLLAMA_REASONING,
    ollamaLocal: process.env.OLLAMA_LOCAL_REASONING_MODEL || OLLAMA_REASONING,
  },
  agent: {
    openrouter:
      process.env.OPENROUTER_AGENT_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    nvidia: process.env.NVIDIA_AGENT_MODEL || 'meta/llama-3.3-70b-instruct',
    ollamaTunnel: process.env.OLLAMA_TUNNEL_AGENT_MODEL || OLLAMA_AGENT,
    ollamaLocal: process.env.OLLAMA_LOCAL_AGENT_MODEL || OLLAMA_AGENT,
  },
  embed: {
    openrouter: process.env.OPENROUTER_EMBED_MODEL || 'openai/text-embedding-3-small',
    ollamaTunnel: process.env.OLLAMA_TUNNEL_EMBED_MODEL || OLLAMA_EMBED,
    ollamaLocal: process.env.OLLAMA_LOCAL_EMBED_MODEL || OLLAMA_EMBED,
  },
  // Vibe Coding — Kimi (cloud, 1T MoE, 128k ctx) → qwen-coder fallback
  coder: {
    openrouter: process.env.OPENROUTER_CODER_MODEL || 'moonshotai/kimi-k2:free',
    nvidia: process.env.NVIDIA_CODER_MODEL || 'meta/llama-3.3-70b-instruct',
    ollamaTunnel: process.env.OLLAMA_TUNNEL_CODER_MODEL || 'qwen2.5-coder:1.5b',
    ollamaLocal: process.env.OLLAMA_LOCAL_CODER_MODEL || 'qwen2.5-coder:1.5b',
  },
  // Cell therapy / clinical / biology reasoning — meditron locally
  bio: {
    openrouter:
      process.env.OPENROUTER_BIO_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    nvidia: process.env.NVIDIA_BIO_MODEL || 'meta/llama-3.3-70b-instruct',
    ollamaTunnel: process.env.OLLAMA_TUNNEL_BIO_MODEL || 'meditron:7b',
    ollamaLocal: process.env.OLLAMA_LOCAL_BIO_MODEL || 'meditron:7b',
  },
}

const PROVIDER_ORDER = (
  process.env.LLM_PROVIDER_ORDER ||
  'openrouter,nvidia,ollamaTunnel,ollamaLocal'
)
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s in PROVIDERS)

// ─────────────────────────────────────────────────────────────────────────────
// Circuit breaker
// ─────────────────────────────────────────────────────────────────────────────
const FAIL_THRESHOLD = Number(process.env.LLM_FAIL_THRESHOLD || 3)
const COOLDOWN_MS = Number(process.env.LLM_COOLDOWN_MS || 5 * 60 * 1000)

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
  breakers.set(provider, {
    failCount: prev.failCount + 1,
    openedAt: Date.now(),
    lastError: (err && err.message) || String(err),
  })
}

function recordSuccess(provider) {
  breakers.delete(provider)
}

function isFailoverError(err) {
  if (!err) return true
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return true
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') return true
  if (err.code === 'EAI_AGAIN') return true
  const status = err.response?.status
  if (!status) return true
  if (status === 400 || status === 401 || status === 403) return false
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// chat
// ─────────────────────────────────────────────────────────────────────────────
async function chatOnce(messages, opts) {
  const { role = 'agent', maxTokens = 500, temperature = 0.7, jsonMode = false } = opts
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
        headers: {
          Authorization: `Bearer ${cfg.apiKey()}`,
          'Content-Type': 'application/json',
          ...cfg.extraHeaders(),
        },
        timeout: 180_000,
      })

      const content = r.data?.choices?.[0]?.message?.content ?? ''
      recordSuccess(p)
      return {
        ok: true,
        content,
        provider: p,
        model,
        elapsedMs: Date.now() - t0,
        raw: r.data,
      }
    } catch (err) {
      lastErr = err
      if (!isFailoverError(err)) throw err
      recordFailure(p, err)
    }
  }

  return { ok: false, lastErr }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function chat(messages, opts = {}) {
  const BACKOFFS_MS = [3000, 8000]
  let result = await chatOnce(messages, opts)
  if (result.ok) return strip(result)

  for (let i = 0; i < BACKOFFS_MS.length; i++) {
    await sleep(BACKOFFS_MS[i])
    result = await chatOnce(messages, opts)
    if (result.ok) return strip(result)
  }

  const lastErr = result.lastErr
  const reason = lastErr?.response
    ? `HTTP ${lastErr.response.status}: ${JSON.stringify(lastErr.response.data).slice(0, 300)}`
    : lastErr?.message || 'no providers available'
  const e = new Error(`All LLM providers exhausted — ${reason}`)
  e.cause = lastErr
  throw e
}

function strip(r) {
  return {
    content: r.content,
    provider: r.provider,
    model: r.model,
    elapsedMs: r.elapsedMs,
    raw: r.raw,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// embed (OpenRouter only — locked due to fixed Atlas vector dim)
// ─────────────────────────────────────────────────────────────────────────────
export async function embed(input) {
  const p = 'openrouter'
  const cfg = PROVIDERS[p]
  if (!cfg.apiKey()) throw new Error('OPENROUTER_API_KEY missing — embeddings unavailable')
  const model = MODELS.embed[p]
  const inputs = Array.isArray(input) ? input : [input]

  const t0 = Date.now()
  try {
    const r = await axios.post(
      cfg.embedUrl,
      { model, input: inputs },
      {
        headers: {
          Authorization: `Bearer ${cfg.apiKey()}`,
          'Content-Type': 'application/json',
          ...cfg.extraHeaders(),
        },
        timeout: 60_000,
      },
    )
    const data = r.data?.data || []
    const embeddings = data.map((d) => d.embedding || [])
    recordSuccess(p)
    return {
      embeddings,
      model,
      dim: embeddings[0]?.length || cfg.embedDim,
      elapsedMs: Date.now() - t0,
    }
  } catch (err) {
    if (isFailoverError(err)) recordFailure(p, err)
    const reason = err?.response
      ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data).slice(0, 300)}`
      : err?.message || 'embed failed'
    const e = new Error(`Embedding failed — ${reason}`)
    e.cause = err
    throw e
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// status diagnostic
// ─────────────────────────────────────────────────────────────────────────────
export function getLlmStatus() {
  const status = {}
  for (const p of Object.keys(PROVIDERS)) {
    const cfg = PROVIDERS[p]
    const b = breakers.get(p)
    const configured = !!cfg.apiKey() && !!cfg.chatUrl
    status[p] = {
      configured,
      models: { ...MODELS, embed: undefined },
      circuit: b
        ? {
            open: b.failCount >= FAIL_THRESHOLD,
            failCount: b.failCount,
            openedAt: b.openedAt && new Date(b.openedAt).toISOString(),
            cooldownEndsAt:
              b.openedAt && new Date(b.openedAt + COOLDOWN_MS).toISOString(),
            lastError: b.lastError,
          }
        : { open: false, failCount: 0 },
    }
  }
  return {
    providerOrder: PROVIDER_ORDER,
    activeOrder: PROVIDER_ORDER.filter((p) => status[p].configured),
    failThreshold: FAIL_THRESHOLD,
    cooldownMs: COOLDOWN_MS,
    providers: status,
    embeddingsRouting: 'openrouter-only (locked due to vector-index dim)',
  }
}
