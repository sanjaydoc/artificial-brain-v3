// Agent enable/disable state — persisted in MongoDB SystemSettings under key
// 'agent_config'. Used by dream pipeline (services/dreamLoop.js) to skip
// disabled lenses. Admin can edit via PUT /api/admin/agent-config.

import { SystemSettings } from '../../models/SystemSettings.js'

export const ALL_AGENT_NAMES = [
  'analogical', 'inversion', 'crossDomain', 'extreme', 'historical',
  'biomimicry', 'combinatorial', 'reduction', 'scaling', 'future',
]

let _enabled = new Set(ALL_AGENT_NAMES)

export function getEnabledAgents() {
  return [..._enabled]
}

export function getAllAgentNames() {
  return [...ALL_AGENT_NAMES]
}

export function isAgentEnabled(name) {
  return _enabled.has(name)
}

// Validate + persist + update in-memory state. Throws if no agents enabled.
export async function setAgentConfig(enabled) {
  const valid = (enabled || []).filter((n) => ALL_AGENT_NAMES.includes(n))
  if (valid.length === 0) throw new Error('Must enable at least one agent')
  _enabled = new Set(valid)
  try {
    await SystemSettings.updateOne(
      { key: 'agent_config' },
      { $set: { value: valid } },
      { upsert: true },
    )
  } catch (err) {
    console.warn('[agentConfig] persist warn:', err.message)
  }
  return [..._enabled]
}

// Load from Mongo on server boot. Falls back to all-enabled if not found.
export async function loadAgentConfig() {
  try {
    const doc = await SystemSettings.findOne({ key: 'agent_config' }).lean()
    if (doc?.value && Array.isArray(doc.value)) {
      const valid = doc.value.filter((n) => ALL_AGENT_NAMES.includes(n))
      if (valid.length > 0) _enabled = new Set(valid)
    }
    console.log(
      `[agentConfig] loaded ${_enabled.size}/${ALL_AGENT_NAMES.length} enabled: ${[..._enabled].join(', ')}`,
    )
  } catch (err) {
    console.warn('[agentConfig] load failed (defaulting to all):', err.message)
  }
}
