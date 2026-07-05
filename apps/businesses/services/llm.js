// Multi-provider LLM client with circuit breaker.
//   • Chat:       OpenRouter (primary) → NVIDIA (fallback)
//   • Embeddings: OpenRouter only — providers ship different dimensions and an
//                 Atlas vector index has FIXED dimensions, so silent fallover
//                 would corrupt the index. We fail loud instead.
//
// Use: import { chat, embed, getLlmStatus } from './services/llm.js'

import axios from 'axios'

// ─────────────────────────────────────────────────────────────────────────────
// Provider config
// ─────────────────────────────────────────────────────────────────────────────
// Normalize a base URL — accepts http://host:port or .../v1 — returns root.
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
      'X-Title': 'Sentiance',
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
  // Tier 3: Self-hosted Ollama exposed via Cloudflare Tunnel (Docker + Caddy gate).
  // Used in production / from cPanel where there's no localhost Ollama.
  ollamaTunnel: {
    get chatUrl() {
      const b = normalizeBase(process.env.OLLAMA_TUNNEL_URL)
      return b ? `${b}/v1/chat/completions` : ''
    },
    get embedUrl() {
      const b = normalizeBase(process.env.OLLAMA_TUNNEL_URL)
      return b ? `${b}/v1/embeddings` : ''
    },
    apiKey: () => 'tunnel-via-caddy-gate', // Bearer placeholder — OAI clients require some value
    extraHeaders: () => {
      const t = process.env.OLLAMA_TUNNEL_AUTH_TOKEN
      return t ? { 'X-Auth-Token': t } : {}
    },
    embedDim: 768,
  },
  // Tier 4: Host machine Ollama on localhost. Active only on machines that have
  // it installed (developer laptops, locally-hosted production). Cleanly skipped
  // on cPanel and other shared hosts.
  // Backward-compat: also picks up the older OLLAMA_BASE_URL if set.
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

// Map canonical roles → provider-specific model IDs.
// Defaults are PROVEN-WORKING models. Env overrides still work but aren't required.
// (Older defaults like 'nvidia/llama-3.1-nemotron-70b-instruct' and the nemotron
//  reasoning model were removed from provider catalogs — never default to those.)
// Tunnel + local Ollama default to the same model names — they're both Ollama.
// Override individually if you want the Docker container to run a different
// model than your laptop.
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
}

// Default order: cloud first (fast), tunnel second (your owned hardware via CF),
// localhost last (only firing when on the dev machine itself or self-hosted box).
const PROVIDER_ORDER = (
  process.env.LLM_PROVIDER_ORDER ||
  'openrouter,nvidia,ollamaTunnel,ollamaLocal'
)
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s in PROVIDERS)

// ─────────────────────────────────────────────────────────────────────────────
// Circuit breaker — in-memory, per-process
// ─────────────────────────────────────────────────────────────────────────────
const FAIL_THRESHOLD = Number(process.env.LLM_FAIL_THRESHOLD || 3)
const COOLDOWN_MS = Number(process.env.LLM_COOLDOWN_MS || 5 * 60 * 1000)

const breakers = new Map() // provider → { failCount, openedAt, lastError }

function shouldSkip(provider) {
  const b = breakers.get(provider)
  if (!b) return false
  if (b.failCount < FAIL_THRESHOLD) return false
  if (Date.now() - b.openedAt < COOLDOWN_MS) return true
  // cooldown elapsed — half-open: allow one trial request
  breakers.delete(provider)
  return false
}

function recordFailure(provider, err) {
  const prev = breakers.get(provider) || { failCount: 0 }
  const next = {
    failCount: prev.failCount + 1,
    openedAt: Date.now(),
    lastError: (err && err.message) || String(err),
  }
  breakers.set(provider, next)
}

function recordSuccess(provider) {
  breakers.delete(provider)
}

// Whether an error means "switch to next provider" vs. "stop and surface".
// Default is FAILOVER (more reliable). Only refuse to fall over for the small
// set of statuses that are unambiguously "our request is wrong, retrying
// against another provider won't help":
//   400 Bad Request  — malformed body
//   401 Unauthorized — bad/missing api key (provider-specific anyway)
//   403 Forbidden    — permission denied (provider-specific anyway)
function isFailoverError(err) {
  if (!err) return true
  // Network / timeout / DNS — always failover
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return true
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') return true
  if (err.code === 'EAI_AGAIN') return true
  const status = err.response?.status
  if (!status) return true
  if (status === 400 || status === 401 || status === 403) return false
  // Everything else (402 payment, 404 model-not-found, 408, 429, 5xx, 503...) → next provider
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: chat
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Try one round through every provider. Returns {ok:true, ...} on success,
 * {ok:false, lastErr} if every provider failed with a failover-eligible error.
 * Throws synchronously on a non-failover error (400/401/403) — no retry.
 */
async function chatOnce(messages, opts) {
  const { role = 'agent', maxTokens = 500, temperature = 0.7, jsonMode = false } = opts
  let lastErr = null

  for (const p of PROVIDER_ORDER) {
    if (shouldSkip(p)) continue
    const cfg = PROVIDERS[p]
    if (!cfg.apiKey()) continue
    if (!cfg.chatUrl) continue // ollama disabled when OLLAMA_BASE_URL not set
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
        timeout: 90_000,
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
      if (!isFailoverError(err)) throw err // bad request — no retry
      recordFailure(p, err)
    }
  }

  return { ok: false, lastErr }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * @param {Array<{role:string,content:string}>} messages
 * @param {{ role?: 'reasoning'|'agent', maxTokens?: number, temperature?: number, jsonMode?: boolean }} opts
 * @returns {Promise<{ content: string, provider: string, model: string, elapsedMs: number, raw: any }>}
 *
 * If every provider fails with a transient error (rate-limit, 5xx, network),
 * back off and try again. Two retries with exponential backoff handle the
 * "both providers 429 for 30 seconds" case we hit during agent bursts.
 */
export async function chat(messages, opts = {}) {
  const BACKOFFS_MS = [3000, 8000] // first retry after 3s, second after 8s
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
// Public: embed (OpenRouter only)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string|string[]} input
 * @returns {Promise<{ embeddings: number[][], model: string, dim: number, elapsedMs: number }>}
 */
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
// Public: status (for /api/llm/status diagnostic)
// ─────────────────────────────────────────────────────────────────────────────
export function getLlmStatus() {
  const status = {}
  for (const p of Object.keys(PROVIDERS)) {
    const cfg = PROVIDERS[p]
    const b = breakers.get(p)
    // A provider is "configured" only if BOTH apiKey + chatUrl are truthy.
    // Ollama variants need URL set to be active.
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
