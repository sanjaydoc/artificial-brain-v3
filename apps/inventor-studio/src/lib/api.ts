import axios from 'axios'

export const api = axios.create({
  baseURL: '/inventor-studio/api',
  timeout: 60000,
})

// Stub auth helpers (no-op, kept for compatibility)
export function getToken(): string | null { return null }
export function setToken(_token: string | null): void {}

// ─────────────────────────────────────────────────────────────────────────────
// Types (kept loose — source of truth is the backend)
// ─────────────────────────────────────────────────────────────────────────────
export type Role = 'User' | 'Admin'
export type Tier = 'free' | 'tier1' | 'tier2' | 'tier3'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface UserDoc {
  id: string
  email: string
  role: Role
  // Boolean alias of role === 'Admin' — convenience for ported react-app pages
  // that check `u.isAdmin`. Backend safeUserData() always sets this.
  isAdmin?: boolean
  subscriptionTier: Tier
  subscriptionExpiresAt: string | null
  approvalStatus: ApprovalStatus
  passwordLoginEnabled: boolean
  patternEnabled: boolean
  biometricEnabled: boolean
  apiKeyPrefix?: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  token: string
  user: UserDoc
}

export const authApi = {
  signup: async () => ({ token: '', user: {} as UserDoc }),
  login: async () => ({ token: '', user: {} as UserDoc }),
  patternLogin: async () => ({ token: '', user: {} as UserDoc }),
  setPattern: async () => ({ ok: true as const, patternEnabled: true as const }),
  me: async () => ({ user: { id: '000000000000000000000001', email: 'brain@local', role: 'Admin' as Role, subscriptionTier: 'tier3' as Tier, approvalStatus: 'approved' as ApprovalStatus } as UserDoc }),
  issueApiKey: async () => ({ apiKey: '', prefix: '' }),
  revokeApiKey: async () => ({ ok: true as const }),
}

// Inventions ────────────────────────────────────────────────────────────────
export interface InventionDoc {
  id: string
  userId?: string
  title: string
  domain: string
  seedConcept: string
  mode: 'dream' | 'invent' | 'evolve'
  status: string
  noveltyScore: number
  feasibilityScore: number
  impactScore: number
  inventionSpec: Record<string, unknown>
  cycleCount: number
  isPublic?: boolean
  createdAt: string
  updatedAt: string
}

export const inventionsApi = {
  list: () =>
    api.get<{ inventions: InventionDoc[] }>('/inventions').then((r) => r.data.inventions),
  get: (id: string) =>
    api.get<{ invention: InventionDoc }>(`/inventions/${id}`).then((r) => r.data.invention),
  remove: (id: string) =>
    api.delete<{ ok: true }>(`/inventions/${id}`).then((r) => r.data),
  setVisibility: (id: string, isPublic: boolean) =>
    api
      .patch<{ ok: true; isPublic: boolean }>(`/inventions/${id}/visibility`, { isPublic })
      .then((r) => r.data),
}

export const dreamApi = {
  start: (data: { seedConcept: string; domain?: string; mode?: string }) =>
    api.post<{ invention: InventionDoc; queueLength: number }>('/dream', data).then((r) => r.data),
  startGuest: (concept: string) =>
    api.post('/dream/guest', { seedConcept: concept }).then((r) => r.data),
  queue: () => api.get<{ length: number; inFlight: number }>('/dream/queue').then((r) => r.data),
}

// Chat ──────────────────────────────────────────────────────────────────────
export interface ChatMessageDoc {
  id: string
  role: 'user' | 'assistant'
  content: string
  triggeredInventionId?: string | null
  createdAt: string
}

export const chatApi = {
  send: (message: string) =>
    api.post<{ reply: string; queued: { id: string; concept: string } | null }>('/chat', { message }, { timeout: 120000 }).then((r) => r.data),
  history: () =>
    api.get<{ messages: ChatMessageDoc[] }>('/chat/history').then((r) => r.data.messages),
  clear: () => api.delete<{ cleared: true }>('/chat/history').then((r) => r.data),
}

// Vibe ──────────────────────────────────────────────────────────────────────
export const vibeApi = {
  send: (message: string, opts: { mode?: string; inventionId?: string } = {}) =>
    api.post<{ reply: string }>('/vibe', { message, ...opts }).then((r) => r.data),
  history: (inventionId?: string) =>
    api
      .get<{ messages: ChatMessageDoc[] }>('/vibe/history', { params: { inventionId } })
      .then((r) => r.data.messages),
  clear: (inventionId?: string) =>
    api.delete<{ cleared: true }>('/vibe/history', { params: { inventionId } }).then((r) => r.data),
}

// Electronics / circuits ────────────────────────────────────────────────────
export interface CircuitDoc {
  id: string
  userId: string
  inventionId?: string | null
  title: string
  description: string
  schematic: { nodes: unknown[]; edges: unknown[] }
  pcb: { nodes: unknown[]; edges: unknown[] }
  bom: unknown[]
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export const electronicsApi = {
  list: () => api.get<{ circuits: CircuitDoc[] }>('/electronics').then((r) => r.data.circuits),
  get: (id: string) =>
    api.get<{ circuit: CircuitDoc }>(`/electronics/${id}`).then((r) => r.data.circuit),
  create: (data: Partial<CircuitDoc>) =>
    api.post<{ circuit: CircuitDoc }>('/electronics', data).then((r) => r.data.circuit),
  update: (id: string, data: Partial<CircuitDoc>) =>
    api.put<{ circuit: CircuitDoc }>(`/electronics/${id}`, data).then((r) => r.data.circuit),
  remove: (id: string) =>
    api.delete<{ ok: true }>(`/electronics/${id}`).then((r) => r.data),
  setVisibility: (id: string, isPublic: boolean) =>
    api
      .patch<{ ok: true; isPublic: boolean }>(`/electronics/${id}/visibility`, { isPublic })
      .then((r) => r.data),
  getPublic: (id: string) =>
    api.get<{ circuit: CircuitDoc }>(`/electronics/public/${id}`).then((r) => r.data.circuit),
}

// Subscriptions (stubbed — unlimited)
export const subscriptionsApi = {
  prices: async () => [],
  me: async () => ({ tier: 'tier3' as Tier, expiresAt: null }),
  history: async () => ({ payments: [] }),
}

// Public (no auth) ──────────────────────────────────────────────────────────
export const publicApi = {
  showcase: () =>
    api.get<{ inventions: InventionDoc[] }>('/public/showcase').then((r) => r.data.inventions),
  invention: (id: string) =>
    api.get<{ invention: InventionDoc }>(`/public/invention/${id}`).then((r) => r.data.invention),
}

// Autonomous (consciousness) ────────────────────────────────────────────────
export interface ConsciousnessState {
  scope: string
  curiosity: number
  satisfaction: number
  excitement: number
  frustration: number
  energy: number
  lastMonologue: string
  cycleCount: number
}

export const autonomousApi = {
  consciousness: () =>
    api.get<{ state: ConsciousnessState | null }>('/autonomous/consciousness').then((r) => r.data),
}

// SSE helper ────────────────────────────────────────────────────────────────
export function consciousnessStreamUrl(): string {
  return '/inventor-studio/api/stream/consciousness'
}

export function inventionStreamUrl(id: string): string {
  return `/inventor-studio/api/stream/invention/${id}`
}

// LLM diagnostic ────────────────────────────────────────────────────────────
export const llmApi = {
  status: () => api.get('/llm/status').then((r) => r.data),
  probe: () => api.get('/llm/probe').then((r) => r.data),
}
