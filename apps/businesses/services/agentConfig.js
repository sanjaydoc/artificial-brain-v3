// Growth-agent enable/disable state — persisted in MongoDB SystemSettings under
// key 'agent_config'. Used by growthLoop.js to skip disabled lenses. Admin
// edits via PUT /api/admin/agent-config.

import { SystemSettings } from '../models/SystemSettings.js'
import { AGENT_NAMES } from './agents.js'

let _enabled = new Set(AGENT_NAMES)

export function getEnabledAgents() {
  return [..._enabled]
}

export function getAllAgentNames() {
  return [...AGENT_NAMES]
}

export function isAgentEnabled(name) {
  return _enabled.has(name)
}

export async function setAgentConfig(enabled) {
  const valid = (enabled || []).filter((n) => AGENT_NAMES.includes(n))
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

export async function loadAgentConfig() {
  try {
    const doc = await SystemSettings.findOne({ key: 'agent_config' }).lean()
    if (doc?.value && Array.isArray(doc.value)) {
      const valid = doc.value.filter((n) => AGENT_NAMES.includes(n))
      if (valid.length > 0) _enabled = new Set(valid)
    }
    console.log(
      `[sentiance agentConfig] loaded ${_enabled.size}/${AGENT_NAMES.length} enabled: ${[..._enabled].join(', ')}`,
    )
  } catch (err) {
    console.warn('[sentiance agentConfig] load failed (defaulting to all):', err.message)
  }
}
