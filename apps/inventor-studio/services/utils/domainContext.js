// AsyncLocalStorage-based per-request domain context.
// Used by the LLM adapter shim if domain-specific routing is needed.

import { AsyncLocalStorage } from 'node:async_hooks'

export const domainALS = new AsyncLocalStorage()

export function getCurrentDomain() {
  return domainALS.getStore()?.domain ?? 'hybrid'
}
