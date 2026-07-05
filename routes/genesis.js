import { Router } from 'express'
import { GenesisProject } from '../models/GenesisProject.js'
import { GenesisAgent } from '../models/GenesisAgent.js'
import { GenesisRun } from '../models/GenesisRun.js'
import { requireAuth } from '../middleware/auth.js'
import { GenesisApproval } from '../models/GenesisApproval.js'
import { executeAgent, deployProject, stopProject, getProjectAgents, getAgentRuns } from '../services/genesisExecutor.js'
import { ingestFolder, findRelevant, getKnowledgeStats, clearKnowledge } from '../services/genesisKnowledge.js'
import { GenesisKnowledge } from '../models/GenesisKnowledge.js'
import { GenesisSettings } from '../models/GenesisSettings.js'

const router = Router()

let _broadcastKeysToAgents = () => {}
export function setBroadcastKeys(fn) { _broadcastKeysToAgents = fn }
function broadcastKeysToAgents(userId) { _broadcastKeysToAgents(userId) }

const MAX_VERSIONS = 20

// List projects
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const projects = await GenesisProject.find({ userId: req.auth.userId })
      .select('name description status nodes edges createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean()
    const list = projects.map(p => ({
      id: String(p._id),
      name: p.name,
      description: p.description,
      status: p.status,
      nodeCount: (p.nodes || []).length,
      edgeCount: (p.edges || []).length,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
    res.json({ ok: true, projects: list })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Create project
router.post('/projects', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name?.trim()) return res.status(400).json({ ok: false, error: 'name required' })
    const project = await GenesisProject.create({
      userId: req.auth.userId,
      name: name.trim(),
      description: (description || '').trim(),
      nodes: [],
      edges: [],
      versions: [],
    })
    res.json({ ok: true, project })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Get project
router.get('/projects/:id', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })
    res.json({ ok: true, project })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Save project (auto-save)
router.put('/projects/:id', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })

    const { name, description, nodes, edges } = req.body

    // Push current state as version before overwriting
    if (project.nodes.length > 0 || project.edges.length > 0) {
      project.versions.push({
        savedAt: new Date(),
        nodes: project.nodes,
        edges: project.edges,
      })
      if (project.versions.length > MAX_VERSIONS) {
        project.versions = project.versions.slice(-MAX_VERSIONS)
      }
    }

    if (name !== undefined) project.name = name.trim()
    if (description !== undefined) project.description = description.trim()
    if (nodes !== undefined) project.nodes = nodes
    if (edges !== undefined) project.edges = edges

    await project.save()
    res.json({ ok: true, project })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Delete project
router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    const result = await GenesisProject.deleteOne({ _id: req.params.id, userId: req.auth.userId })
    if (result.deletedCount === 0) return res.status(404).json({ ok: false, error: 'not found' })
    // Cascade delete agents, runs, approvals, and knowledge
    const agents = await GenesisAgent.find({ projectId: req.params.id }).select('_id')
    const agentIds = agents.map(a => a._id)
    if (agentIds.length) {
      await GenesisRun.deleteMany({ agentId: { $in: agentIds } })
      await GenesisApproval.deleteMany({ agentId: { $in: agentIds } })
      await GenesisKnowledge.deleteMany({ projectId: req.params.id })
    }
    await GenesisAgent.deleteMany({ projectId: req.params.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Get version history
router.get('/projects/:id/versions', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.auth.userId })
      .select('versions')
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })
    const versions = (project.versions || []).map((v, i) => ({
      index: i,
      savedAt: v.savedAt,
      nodeCount: (v.nodes || []).length,
      edgeCount: (v.edges || []).length,
    }))
    res.json({ ok: true, versions })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Restore version
router.post('/projects/:id/versions/:index/restore', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })
    const idx = Number(req.params.index)
    const version = project.versions[idx]
    if (!version) return res.status(404).json({ ok: false, error: 'version not found' })

    project.versions.push({ savedAt: new Date(), nodes: project.nodes, edges: project.edges })
    if (project.versions.length > MAX_VERSIONS) project.versions = project.versions.slice(-MAX_VERSIONS)

    project.nodes = version.nodes
    project.edges = version.edges
    await project.save()
    res.json({ ok: true, project })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Layer Config ──────────────────────────────────────────────────────────

// Get project layer config
router.get('/projects/:id/layers', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.auth.userId })
      .select('layerConfig')
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })
    res.json({
      ok: true,
      layerConfig: {
        orchestrator: {
          mode: project.layerConfig?.orchestrator?.mode || 'manual',
          maxConcurrent: project.layerConfig?.orchestrator?.maxConcurrent ?? 3,
          maxTokensPerMin: project.layerConfig?.orchestrator?.maxTokensPerMin ?? 10000,
        },
        memory: {
          mode: project.layerConfig?.memory?.mode || 'manual',
          defaultThreshold: project.layerConfig?.memory?.defaultThreshold ?? 0.6,
          defaultPruneAge: project.layerConfig?.memory?.defaultPruneAge ?? 300,
        },
        tools: {
          sandboxMode: project.layerConfig?.tools?.sandboxMode ?? true,
          maxCallsPerMin: project.layerConfig?.tools?.maxCallsPerMin ?? 30,
          blockedTools: project.layerConfig?.tools?.blockedTools || [],
        },
        identity: {
          tokenTTL: project.layerConfig?.identity?.tokenTTL ?? 3600,
          defaultScopes: {
            read: project.layerConfig?.identity?.defaultScopes?.read ?? true,
            write: project.layerConfig?.identity?.defaultScopes?.write ?? true,
            admin: project.layerConfig?.identity?.defaultScopes?.admin ?? false,
          },
        },
        guardrails: {
          inputCheck: project.layerConfig?.guardrails?.inputCheck ?? true,
          outputCheck: project.layerConfig?.guardrails?.outputCheck ?? true,
          sensitivity: project.layerConfig?.guardrails?.sensitivity || 'medium',
          autoApprove: project.layerConfig?.guardrails?.autoApprove ?? false,
          notifications: {
            email: project.layerConfig?.guardrails?.notifications?.email || '',
            webhook: project.layerConfig?.guardrails?.notifications?.webhook || '',
          },
          governanceRules: project.layerConfig?.guardrails?.governanceRules || [],
        },
      },
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Update project layer config (partial merge)
router.put('/projects/:id/layers', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })

    const { orchestrator, memory, tools, identity, guardrails } = req.body
    if (!project.layerConfig) project.layerConfig = {}

    if (orchestrator) {
      if (!project.layerConfig.orchestrator) project.layerConfig.orchestrator = {}
      if (orchestrator.mode !== undefined) project.layerConfig.orchestrator.mode = orchestrator.mode
      if (orchestrator.maxConcurrent !== undefined) project.layerConfig.orchestrator.maxConcurrent = orchestrator.maxConcurrent
      if (orchestrator.maxTokensPerMin !== undefined) project.layerConfig.orchestrator.maxTokensPerMin = orchestrator.maxTokensPerMin
    }
    if (memory) {
      if (!project.layerConfig.memory) project.layerConfig.memory = {}
      if (memory.mode !== undefined) project.layerConfig.memory.mode = memory.mode
      if (memory.defaultThreshold !== undefined) project.layerConfig.memory.defaultThreshold = memory.defaultThreshold
      if (memory.defaultPruneAge !== undefined) project.layerConfig.memory.defaultPruneAge = memory.defaultPruneAge
    }
    if (tools) {
      if (!project.layerConfig.tools) project.layerConfig.tools = {}
      if (tools.sandboxMode !== undefined) project.layerConfig.tools.sandboxMode = tools.sandboxMode
      if (tools.maxCallsPerMin !== undefined) project.layerConfig.tools.maxCallsPerMin = tools.maxCallsPerMin
      if (tools.blockedTools !== undefined) project.layerConfig.tools.blockedTools = tools.blockedTools
    }
    if (identity) {
      if (!project.layerConfig.identity) project.layerConfig.identity = {}
      if (identity.tokenTTL !== undefined) project.layerConfig.identity.tokenTTL = identity.tokenTTL
      if (identity.defaultScopes !== undefined) {
        if (!project.layerConfig.identity.defaultScopes) project.layerConfig.identity.defaultScopes = {}
        if (identity.defaultScopes.read !== undefined) project.layerConfig.identity.defaultScopes.read = identity.defaultScopes.read
        if (identity.defaultScopes.write !== undefined) project.layerConfig.identity.defaultScopes.write = identity.defaultScopes.write
        if (identity.defaultScopes.admin !== undefined) project.layerConfig.identity.defaultScopes.admin = identity.defaultScopes.admin
      }
    }
    if (guardrails) {
      if (!project.layerConfig.guardrails) project.layerConfig.guardrails = {}
      if (guardrails.inputCheck !== undefined) project.layerConfig.guardrails.inputCheck = guardrails.inputCheck
      if (guardrails.outputCheck !== undefined) project.layerConfig.guardrails.outputCheck = guardrails.outputCheck
      if (guardrails.sensitivity !== undefined) project.layerConfig.guardrails.sensitivity = guardrails.sensitivity
      if (guardrails.autoApprove !== undefined) project.layerConfig.guardrails.autoApprove = guardrails.autoApprove
      if (guardrails.notifications !== undefined) {
        if (!project.layerConfig.guardrails.notifications) project.layerConfig.guardrails.notifications = {}
        if (guardrails.notifications.email !== undefined) project.layerConfig.guardrails.notifications.email = guardrails.notifications.email
        if (guardrails.notifications.webhook !== undefined) project.layerConfig.guardrails.notifications.webhook = guardrails.notifications.webhook
      }
      if (guardrails.governanceRules !== undefined) project.layerConfig.guardrails.governanceRules = guardrails.governanceRules
    }

    project.markModified('layerConfig')
    await project.save()
    res.json({ ok: true, layerConfig: project.layerConfig })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Update per-agent layer settings
router.put('/agents/:agentId/layers', requireAuth, async (req, res) => {
  try {
    const agent = await GenesisAgent.findOne({ _id: req.params.agentId, userId: req.auth.userId })
    if (!agent) return res.status(404).json({ ok: false, error: 'agent not found' })

    const { priority, memoryType, memoryQuota, toolRateLimit, scopes } = req.body
    if (!agent.layers) agent.layers = {}

    if (priority !== undefined) agent.layers.priority = Math.max(1, Math.min(10, Number(priority)))
    if (memoryType !== undefined) agent.layers.memoryType = memoryType
    if (memoryQuota !== undefined) {
      if (!agent.layers.memoryQuota) agent.layers.memoryQuota = {}
      if (memoryQuota.short !== undefined) agent.layers.memoryQuota.short = memoryQuota.short
      if (memoryQuota.long !== undefined) agent.layers.memoryQuota.long = memoryQuota.long
    }
    if (toolRateLimit !== undefined) agent.layers.toolRateLimit = toolRateLimit
    if (scopes !== undefined) agent.layers.scopes = scopes

    agent.markModified('layers')
    await agent.save()
    res.json({ ok: true, layers: agent.layers })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Deploy / Stop ──────────────────────────────────────────────────────────

// Deploy all agents in a project
router.post('/projects/:id/deploy', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })

    const agents = await deployProject(project._id, req.auth.userId, project.nodes, project.edges)

    project.status = 'deployed'
    await project.save()

    res.json({ ok: true, agents, count: agents.length })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Stop all agents in a project
router.post('/projects/:id/stop', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })

    const stopped = await stopProject(project._id)

    project.status = 'stopped'
    await project.save()

    res.json({ ok: true, stopped })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Get agents + status for a project
router.get('/projects/:id/agents', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })

    const agents = await getProjectAgents(project._id)
    res.json({ ok: true, agents })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Run Agent ──────────────────────────────────────────────────────────────

// Trigger a single agent run
router.post('/agents/:agentId/run', requireAuth, async (req, res) => {
  try {
    const agent = await GenesisAgent.findOne({ _id: req.params.agentId, userId: req.auth.userId })
    if (!agent) return res.status(404).json({ ok: false, error: 'agent not found' })

    const { input, trigger, token } = req.body
    const run = await executeAgent(agent._id, input || '', trigger || 'manual', token || '')

    res.json({ ok: true, run })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Get runs for an agent
router.get('/agents/:agentId/runs', requireAuth, async (req, res) => {
  try {
    const agent = await GenesisAgent.findOne({ _id: req.params.agentId, userId: req.auth.userId })
    if (!agent) return res.status(404).json({ ok: false, error: 'agent not found' })

    const runs = await getAgentRuns(agent._id, Number(req.query.limit || 20))
    res.json({ ok: true, runs })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Runtime Dashboard ──────────────────────────────────────────────────────

// All running/recent agents for this user
router.get('/runtime', requireAuth, async (req, res) => {
  try {
    const agents = await GenesisAgent.find({ userId: req.auth.userId })
      .select('-secrets')
      .sort({ updatedAt: -1 })
      .lean()
    const agentList = agents.map(a => ({ ...a, id: String(a._id) }))

    // Get latest run for each agent
    const withRuns = await Promise.all(agentList.map(async (a) => {
      const lastRun = await GenesisRun.findOne({ agentId: a.id })
        .sort({ createdAt: -1 })
        .select('status trigger input output startedAt completedAt')
        .lean()
      return { ...a, lastRun: lastRun ? { ...lastRun, id: String(lastRun._id) } : null }
    }))

    res.json({ ok: true, agents: withRuns })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Single agent run detail with full steps
router.get('/runs/:runId', requireAuth, async (req, res) => {
  try {
    const run = await GenesisRun.findOne({ _id: req.params.runId, userId: req.auth.userId })
    if (!run) return res.status(404).json({ ok: false, error: 'run not found' })
    res.json({ ok: true, run })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Approvals ──────────────────────────────────────────────────────────────

// List pending approvals
router.get('/approvals', requireAuth, async (req, res) => {
  try {
    const filter = { userId: req.auth.userId }
    if (req.query.status) filter.status = req.query.status
    const raw = await GenesisApproval.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit || 50))
      .lean()
    const approvals = raw.map(a => ({ ...a, id: String(a._id) }))
    res.json({ ok: true, approvals })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Approve or deny
router.post('/approvals/:id/decide', requireAuth, async (req, res) => {
  try {
    const approval = await GenesisApproval.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!approval) return res.status(404).json({ ok: false, error: 'not found' })
    const { decision } = req.body
    if (!['approved', 'denied'].includes(decision)) return res.status(400).json({ ok: false, error: 'decision must be approved or denied' })

    approval.status = decision
    approval.decidedBy = req.auth.userId
    approval.decidedAt = new Date()
    await approval.save()

    res.json({ ok: true, approval })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Audit Trail ────────────────────────────────────────────────────────────

// Full audit: all runs across all agents, with steps
router.get('/audit', requireAuth, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100)
    const runs = await GenesisRun.find({ userId: req.auth.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    // Enrich with agent names
    const agentIds = [...new Set(runs.map(r => String(r.agentId)))]
    const agents = await GenesisAgent.find({ _id: { $in: agentIds } }).select('name nodeId').lean()
    const agentMap = Object.fromEntries(agents.map(a => [String(a._id), a.name]))

    const enriched = runs.map(r => ({
      ...r,
      id: String(r._id),
      agentName: agentMap[String(r.agentId)] || 'Unknown',
    }))

    res.json({ ok: true, runs: enriched })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Knowledge Base (RAG) ──────────────────────────────────────────────────

// Ingest a folder into an agent's knowledge base (SSE streaming)
router.post('/agents/:agentId/ingest', requireAuth, async (req, res) => {
  try {
    const agent = await GenesisAgent.findOne({ _id: req.params.agentId, userId: req.auth.userId })
    if (!agent) return res.status(404).json({ ok: false, error: 'agent not found' })

    const { folderPath } = req.body
    if (!folderPath?.trim()) return res.status(400).json({ ok: false, error: 'folderPath required' })

    // Set up SSE stream
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    try {
      const result = await ingestFolder(agent._id, agent.projectId, folderPath.trim(), sendEvent)
      sendEvent({ type: 'complete', ok: true, ...result })
    } catch (err) {
      sendEvent({ type: 'error', message: err.message })
    }

    res.end()
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: e.message })
    }
  }
})

// Get knowledge stats for an agent
router.get('/agents/:agentId/knowledge', requireAuth, async (req, res) => {
  try {
    const agent = await GenesisAgent.findOne({ _id: req.params.agentId, userId: req.auth.userId })
    if (!agent) return res.status(404).json({ ok: false, error: 'agent not found' })

    const stats = await getKnowledgeStats(agent._id)
    res.json({ ok: true, ...stats })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Clear all knowledge for an agent
router.delete('/agents/:agentId/knowledge', requireAuth, async (req, res) => {
  try {
    const agent = await GenesisAgent.findOne({ _id: req.params.agentId, userId: req.auth.userId })
    if (!agent) return res.status(404).json({ ok: false, error: 'agent not found' })

    const result = await clearKnowledge(agent._id)
    res.json({ ok: true, ...result })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Search knowledge (for testing/debugging)
router.post('/agents/:agentId/knowledge/search', requireAuth, async (req, res) => {
  try {
    const agent = await GenesisAgent.findOne({ _id: req.params.agentId, userId: req.auth.userId })
    if (!agent) return res.status(404).json({ ok: false, error: 'agent not found' })

    const { query, limit = 5 } = req.body
    if (!query?.trim()) return res.status(400).json({ ok: false, error: 'query required' })

    const results = await findRelevant(agent._id, query.trim(), Number(limit))
    res.json({ ok: true, results, count: results.length })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Settings / API Keys ──────────────────────────────────────────────────

// Mask a key value: show only last 4 chars
function maskKey(val) {
  if (!val || typeof val !== 'string') return null
  if (val.length <= 4) return '****'
  return '****' + val.slice(-4)
}

// Get all configured keys (masked)
router.get('/settings/keys', requireAuth, async (req, res) => {
  try {
    const doc = await GenesisSettings.findOne({ key: 'api_keys', userId: req.auth.userId })
    const keys = doc?.value || {}
    const masked = {}
    for (const [k, v] of Object.entries(keys)) {
      masked[k] = { set: !!v, masked: maskKey(v) }
    }
    res.json({ ok: true, keys: masked })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Save/update keys (partial merge)
router.put('/settings/keys', requireAuth, async (req, res) => {
  try {
    const { keys } = req.body
    if (!keys || typeof keys !== 'object') return res.status(400).json({ ok: false, error: 'keys object required' })

    let doc = await GenesisSettings.findOne({ key: 'api_keys', userId: req.auth.userId })
    if (!doc) {
      doc = await GenesisSettings.create({ key: 'api_keys', userId: req.auth.userId, value: keys })
    } else {
      // Merge: only update provided keys, keep existing ones
      const current = doc.value || {}
      for (const [k, v] of Object.entries(keys)) {
        if (v === null || v === '') {
          delete current[k]  // null/empty = remove key
        } else {
          current[k] = v
        }
      }
      doc.value = current
      doc.markModified('value')
      await doc.save()
    }

    // Broadcast to connected agents
    broadcastKeysToAgents(req.auth.userId)

    // Return masked
    const masked = {}
    const savedKeys = doc.value || {}
    for (const [k, v] of Object.entries(savedKeys)) {
      masked[k] = { set: !!v, masked: maskKey(v) }
    }
    res.json({ ok: true, keys: masked })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Test a provider connection
router.post('/settings/keys/test', requireAuth, async (req, res) => {
  try {
    const { provider } = req.body
    if (!provider) return res.status(400).json({ ok: false, error: 'provider required' })

    const doc = await GenesisSettings.findOne({ key: 'api_keys', userId: req.auth.userId })
    const keys = doc?.value || {}

    let testResult = { connected: false, message: 'Unknown provider' }

    if (provider === 'hubspot') {
      const token = keys.hubspot_token
      if (!token) return res.json({ ok: true, connected: false, message: 'No token configured' })
      const r = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      testResult = r.ok ? { connected: true, message: 'HubSpot connected' } : { connected: false, message: `HubSpot error: HTTP ${r.status}` }
    }
    else if (provider === 'stripe') {
      const key = keys.stripe_secret_key
      if (!key) return res.json({ ok: true, connected: false, message: 'No key configured' })
      const r = await fetch('https://api.stripe.com/v1/balance', {
        headers: { 'Authorization': `Basic ${Buffer.from(key + ':').toString('base64')}` }
      })
      testResult = r.ok ? { connected: true, message: 'Stripe connected' } : { connected: false, message: `Stripe error: HTTP ${r.status}` }
    }
    else if (provider === 'openrouter') {
      const key = keys.openrouter_api_key
      if (!key) return res.json({ ok: true, connected: false, message: 'No key configured' })
      const r = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      })
      testResult = r.ok ? { connected: true, message: 'OpenRouter connected' } : { connected: false, message: `OpenRouter error: HTTP ${r.status}` }
    }
    else if (provider === 'google_calendar') {
      const token = keys.google_oauth_token || keys.google_calendar_api_key
      if (!token) return res.json({ ok: true, connected: false, message: 'No token configured' })
      const r = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      testResult = r.ok ? { connected: true, message: 'Google Calendar connected' } : { connected: false, message: `Google error: HTTP ${r.status}` }
    }
    else if (provider === 'salesforce') {
      const token = keys.salesforce_token
      const url = keys.salesforce_instance_url
      if (!token || !url) return res.json({ ok: true, connected: false, message: 'Token and Instance URL both required' })
      const r = await fetch(`${url}/services/data/v59.0/limits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      testResult = r.ok ? { connected: true, message: 'Salesforce connected' } : { connected: false, message: `Salesforce error: HTTP ${r.status}` }
    }
    else if (provider === 'quickbooks') {
      const token = keys.quickbooks_token
      const realmId = keys.quickbooks_realm_id
      if (!token || !realmId) return res.json({ ok: true, connected: false, message: 'Token and Realm ID both required' })
      const base = keys.quickbooks_base_url || 'https://quickbooks.api.intuit.com'
      const r = await fetch(`${base}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      })
      testResult = r.ok ? { connected: true, message: 'QuickBooks connected' } : { connected: false, message: `QuickBooks error: HTTP ${r.status}` }
    }
    else if (provider === 'twilio') {
      const sid = keys.twilio_account_sid
      const authToken = keys.twilio_auth_token
      if (!sid || !authToken) return res.json({ ok: true, connected: false, message: 'Account SID and Auth Token both required' })
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: { 'Authorization': `Basic ${Buffer.from(sid + ':' + authToken).toString('base64')}` }
      })
      testResult = r.ok ? { connected: true, message: 'Twilio connected' } : { connected: false, message: `Twilio error: HTTP ${r.status}` }
    }
    else {
      testResult = { connected: false, message: `No test available for provider: ${provider}` }
    }

    res.json({ ok: true, ...testResult })
  } catch (e) {
    res.json({ ok: true, connected: false, message: e.message })
  }
})

// Delete a provider's keys
router.delete('/settings/keys/:provider', requireAuth, async (req, res) => {
  try {
    const { provider } = req.params
    const doc = await GenesisSettings.findOne({ key: 'api_keys', userId: req.auth.userId })
    if (!doc) return res.json({ ok: true })

    const current = doc.value || {}
    // Remove all keys that start with the provider prefix
    const prefix = provider + '_'
    for (const k of Object.keys(current)) {
      if (k === provider || k.startsWith(prefix)) delete current[k]
    }
    doc.value = current
    doc.markModified('value')
    await doc.save()

    broadcastKeysToAgents(req.auth.userId)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Per-Agent Secrets ────────────────────────────────────────────────────

// Get agent secrets (masked)
router.get('/agents/:agentId/secrets', requireAuth, async (req, res) => {
  try {
    const agent = await GenesisAgent.findOne({ _id: req.params.agentId, userId: req.auth.userId })
    if (!agent) return res.status(404).json({ ok: false, error: 'agent not found' })
    const secrets = agent.secrets || new Map()
    const masked = {}
    for (const [k, v] of secrets) {
      masked[k] = { set: !!v, masked: maskKey(v) }
    }
    res.json({ ok: true, secrets: masked })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Save/update agent secrets (partial merge)
router.put('/agents/:agentId/secrets', requireAuth, async (req, res) => {
  try {
    const agent = await GenesisAgent.findOne({ _id: req.params.agentId, userId: req.auth.userId })
    if (!agent) return res.status(404).json({ ok: false, error: 'agent not found' })

    const { secrets } = req.body
    if (!secrets || typeof secrets !== 'object') return res.status(400).json({ ok: false, error: 'secrets object required' })

    if (!agent.secrets) agent.secrets = new Map()
    for (const [k, v] of Object.entries(secrets)) {
      if (v === null || v === '') {
        agent.secrets.delete(k)
      } else {
        agent.secrets.set(k, v)
      }
    }
    agent.markModified('secrets')
    await agent.save()

    // Return masked
    const masked = {}
    for (const [k, v] of agent.secrets) {
      masked[k] = { set: !!v, masked: maskKey(v) }
    }
    res.json({ ok: true, secrets: masked })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

export default router
