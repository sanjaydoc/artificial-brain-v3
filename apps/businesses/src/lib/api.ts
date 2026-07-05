import axios from 'axios'

export const api = axios.create({
  baseURL: '/businesses/api',
  timeout: 30000,
})

// Stub auth helpers (kept for compatibility with pages that import them)
export function getToken(): string | null { return null }
export function setToken(_token: string | null): void {}

export type Role = 'Business' | 'Personal' | 'Admin'

export interface UserDoc {
  username: string
  email: string
  role: Role
  displayName?: string
  createdAt?: string
}

export interface AuthResponse {
  token: string
  user: UserDoc
}

export const authApi = {
  signup: async () => ({ token: '', user: {} as UserDoc }),
  login: async () => ({ token: '', user: {} as UserDoc }),
  me: async () => ({ user: { username: 'brain', email: 'brain@local', role: 'Admin' as Role } }),
  checkUsername: async () => ({ available: true, valid: true }),
}

// ── Uploads ──
export type UploadStatus = 'uploaded' | 'parsing' | 'chunking' | 'ready' | 'error'

export interface UploadDoc {
  id: string
  fileName: string
  storedName: string
  mimeType: string
  size: number
  extractedTextLength: number
  chunkCount: number
  status: UploadStatus
  error?: string
  createdAt: string
  updatedAt: string
}

export type ScrapeStatus = 'queued' | 'fetching' | 'parsing' | 'chunking' | 'ready' | 'error'

export interface ScrapeDoc {
  id: string
  url: string
  kind: 'website' | 'social'
  title: string
  description: string
  textLength: number
  chunkCount: number
  status: ScrapeStatus
  error?: string
  httpStatus: number
  createdAt: string
  updatedAt: string
}

export const uploadsApi = {
  list: () => api.get<{ uploads: UploadDoc[] }>('/uploads').then((r) => r.data.uploads),
  upload: (files: File[], onProgress?: (pct: number) => void) => {
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    return api
      .post<{ uploads: UploadDoc[] }>('/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (ev) => {
          if (ev.total && onProgress) onProgress(Math.round((ev.loaded / ev.total) * 100))
        },
      })
      .then((r) => r.data.uploads)
  },
  remove: (id: string) => api.delete<{ ok: true }>(`/uploads/${id}`).then((r) => r.data),
}

export const scrapeApi = {
  list: () => api.get<{ scrapes: ScrapeDoc[] }>('/scrape').then((r) => r.data.scrapes),
  scrape: (urls: string[]) =>
    api.post<{ scrapes: ScrapeDoc[] }>('/scrape', { urls }, { timeout: 120000 }).then((r) => r.data.scrapes),
  remove: (id: string) => api.delete<{ ok: true }>(`/scrape/${id}`).then((r) => r.data),
}

// ── Growth ──
export type GrowthStatus =
  | 'queued'
  | 'gathering'
  | 'reasoning'
  | 'synthesizing'
  | 'critiquing'
  | 'planning'
  | 'complete'
  | 'error'

export interface AgentEntry {
  lens: string
  output: string
  provider: string
  model: string
  elapsedMs: number
  error?: string
  completedAt?: string
}

export interface GrowthPlan {
  title: string
  oneLiner: string
  problemSolved: string
  growthOpportunities: string[]
  executionPlan: { phase: string; duration: string; steps: string[] }[]
  costStructure: {
    items: { name: string; estimate: string; notes: string }[]
    totalEstimate: string
    notes: string
  }
  costCutOpportunities: { name: string; savings: string; how: string }[]
  noveltyScore: number
  feasibilityScore: number
  impactScore: number
  competitorAnalysis: string[]
  marketConnections: string[]
  nextExperiments: string[]
  timeToFirstResults: string
}

export interface GrowthDoc {
  id: string
  concept: string
  status: GrowthStatus
  contextLength: number
  sourceCounts: { uploads: number; scrapes: number; chunks: number }
  agents: AgentEntry[]
  synthesis: string
  critique: string
  plan: Partial<GrowthPlan>
  error?: string
  startedAt: string
  completedAt?: string
  totalElapsedMs: number
  createdAt: string
  updatedAt: string
  isPublic?: boolean
}

export interface PublicGrowthOwner {
  username: string
  displayName: string
  handle: string
}

export interface GrowthListItem {
  id: string
  concept: string
  status: GrowthStatus
  startedAt: string
  completedAt?: string
  totalElapsedMs: number
  createdAt: string
}

export interface GrowthEvent {
  type:
    | 'status'
    | 'context'
    | 'agent_start'
    | 'agent_output'
    | 'agent_error'
    | 'synthesis'
    | 'synthesis_error'
    | 'critique'
    | 'critique_error'
    | 'plan'
    | 'plan_error'
    | 'complete'
    | 'error'
  data: any
  t?: number
}

export const growthApi = {
  list: () => api.get<{ growths: GrowthListItem[] }>('/growth').then((r) => r.data.growths),
  get: (id: string) => api.get<{ growth: GrowthDoc }>(`/growth/${id}`).then((r) => r.data.growth),
  start: (concept: string) =>
    api.post<{ growth: GrowthDoc }>('/growth', { concept }).then((r) => r.data.growth),
  remove: (id: string) => api.delete<{ ok: true }>(`/growth/${id}`).then((r) => r.data),
  setVisibility: (id: string, isPublic: boolean) =>
    api
      .patch<{ ok: true; isPublic: boolean; id: string }>(`/growth/${id}/visibility`, { isPublic })
      .then((r) => r.data),
  stream(
    id: string,
    onEvent: (evt: GrowthEvent) => void,
    onError?: (err: Error) => void,
  ): () => void {
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const r = await fetch(`/businesses/api/growth/${id}/stream`, {
          method: 'GET',
          signal: ctrl.signal,
        })
        if (!r.ok || !r.body) {
          onError?.(new Error(`stream ${r.status}`))
          return
        }
        const reader = r.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          let idx
          while ((idx = buf.indexOf('\n\n')) !== -1) {
            const block = buf.slice(0, idx)
            buf = buf.slice(idx + 2)
            const evt: GrowthEvent = { type: 'status', data: {} }
            for (const line of block.split('\n')) {
              if (line.startsWith('event: ')) evt.type = line.slice(7).trim() as GrowthEvent['type']
              else if (line.startsWith('data: ')) {
                try {
                  evt.data = JSON.parse(line.slice(6))
                } catch {
                  evt.data = line.slice(6)
                }
              }
            }
            onEvent(evt)
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') onError?.(err as Error)
      }
    })()
    return () => ctrl.abort()
  },
}

// ── Chat ──
export interface ChatMessageDoc {
  id: string
  role: 'user' | 'assistant'
  content: string
  triggeredGrowthId?: string | null
  createdAt: string
}

export interface ChatSendResponse {
  reply: string
  queued: { id: string; concept: string } | null
  planLimit?: boolean
}

export const chatApi = {
  send: (message: string) =>
    api.post<ChatSendResponse>('/chat', { message }, { timeout: 120000 }).then((r) => r.data),
  history: () =>
    api.get<{ messages: ChatMessageDoc[] }>('/chat/history').then((r) => r.data.messages),
  clear: () => api.delete<{ cleared: true }>('/chat/history').then((r) => r.data),
}

// ── Subscriptions (stub — no pricing in businesses app) ──
export type TierCode = 'free' | 'starter' | 'growth' | 'enterprise'

export interface MeSubscription {
  tier: TierCode
  tierName: string
  expiresAt: string | null
  analysisCount: number
  analysisLimit: number
  periodResetAt: string | null
}

export const subscriptionsApi = {
  me: async (): Promise<MeSubscription> => ({
    tier: 'enterprise',
    tierName: 'Enterprise',
    expiresAt: null,
    analysisCount: 0,
    analysisLimit: 0, // 0 = unlimited
    periodResetAt: null,
  }),
  prices: async () => [],
}
