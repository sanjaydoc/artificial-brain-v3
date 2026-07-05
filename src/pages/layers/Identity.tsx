import { useState, useEffect, useCallback, useRef } from 'react'
import { Key, RefreshCw, Copy, Check, Shield } from 'lucide-react'

interface Agent { id: string; name: string; status: string; layers?: { scopes?: string[] } }
interface Project { id: string; name: string }

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('brain_token')}`,
  'Content-Type': 'application/json',
})

export default function Identity() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [projectsLoading, setProjectsLoading] = useState(true)

  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [tokenTTL, setTokenTTL] = useState(3600)
  const [defaultScopes, setDefaultScopes] = useState<{ read: boolean; write: boolean; admin: boolean }>({ read: true, write: true, admin: false })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch projects on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/genesis/api/projects', { headers: authHeaders() })
        const data = await r.json()
        if (data.ok) setProjects(data.projects || [])
      } catch {} finally { setProjectsLoading(false) }
    })()
  }, [])

  // Load layer config + agents when project changes
  const loadProjectData = useCallback(async (pid: string) => {
    if (!pid) { setAgents([]); return }
    setLoading(true)
    try {
      const [layersRes, agentsRes] = await Promise.all([
        fetch(`/genesis/api/projects/${pid}/layers`, { headers: authHeaders() }),
        fetch(`/genesis/api/projects/${pid}/agents`, { headers: authHeaders() }),
      ])
      const layersData = await layersRes.json()
      const agentsData = await agentsRes.json()

      if (layersData.ok && layersData.layerConfig?.identity) {
        const id = layersData.layerConfig.identity
        if (id.tokenTTL != null) setTokenTTL(id.tokenTTL)
        if (id.defaultScopes) setDefaultScopes({ read: !!id.defaultScopes.read, write: !!id.defaultScopes.write, admin: !!id.defaultScopes.admin })
      }
      if (agentsData.ok) setAgents(agentsData.agents || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadProjectData(projectId) }, [projectId, loadProjectData])

  // Debounced save for identity config
  const saveIdentityConfig = useCallback((ttl: number, scopes: { read: boolean; write: boolean; admin: boolean }) => {
    if (!projectId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/genesis/api/projects/${projectId}/layers`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ identity: { tokenTTL: ttl, defaultScopes: scopes } }),
        })
      } catch {}
    }, 500)
  }, [projectId])

  // Trigger save when config values change (skip if no project selected)
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return }
    saveIdentityConfig(tokenTTL, defaultScopes)
  }, [tokenTTL, defaultScopes, saveIdentityConfig])

  // Reset the initial-mount guard when project changes so we don't save the loaded values back
  useEffect(() => { isInitialMount.current = true }, [projectId])

  // Per-agent scopes update
  const updateAgentScopes = async (agentId: string, scopes: string[]) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, layers: { ...a.layers, scopes } } : a))
    try {
      await fetch(`/genesis/api/agents/${agentId}/layers`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ scopes }),
      })
    } catch {}
  }

  const toggleAgentScope = (agentId: string, scope: string, currentScopes: string[]) => {
    const newScopes = currentScopes.includes(scope)
      ? currentScopes.filter(s => s !== scope)
      : [...currentScopes, scope]
    updateAgentScopes(agentId, newScopes)
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleDefaultScope = (scope: 'read' | 'write' | 'admin') => {
    setDefaultScopes(prev => ({ ...prev, [scope]: !prev[scope] }))
  }

  const ttlLabel = tokenTTL < 3600 ? `${tokenTTL / 60}m` : `${tokenTTL / 3600}h`

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.7rem] font-medium text-muted-foreground mb-2">Layer 4</p>
        <h1 className="text-lg font-kanit font-semibold">Identity Manager</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Agent credentials, permission scopes, acting-on-behalf-of mapping, and audit logs.
        </p>
      </div>

      {/* Project selector */}
      <div className="flex items-center gap-3">
        <label className="text-[0.7rem] font-medium text-muted-foreground shrink-0">Project</label>
        {projectsLoading ? (
          <span className="text-xs text-muted-foreground">Loading projects...</span>
        ) : projects.length === 0 ? (
          <span className="text-xs text-muted-foreground">No projects found</span>
        ) : (
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
          >
            <option value="">Select a project...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {!projectId ? (
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">Select a project to configure</p>
        </div>
      ) : (
        <>
          {/* Global settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-[0.7rem] font-medium text-muted-foreground mb-3">
                Token TTL: {ttlLabel}
              </h3>
              <input type="range" min="300" max="86400" step="300" value={tokenTTL}
                onChange={e => setTokenTTL(Number(e.target.value))}
                className="w-full accent-primary" />
              <p className="text-xs text-muted-foreground mt-2">Agent tokens expire after this duration. Shorter = more secure.</p>
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-[0.7rem] font-medium text-muted-foreground mb-3">Default Scopes</h3>
              <div className="flex gap-2">
                {(['read', 'write', 'admin'] as const).map(scope => (
                  <div key={scope} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-muted">
                    <input type="checkbox" checked={defaultScopes[scope]} onChange={() => toggleDefaultScope(scope)} className="w-3.5 h-3.5 accent-primary" />
                    <span className="text-xs font-semibold text-foreground capitalize">{scope}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agent credentials table */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-kanit font-semibold flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" /> Agent Credentials
              </h3>
              <button onClick={() => loadProjectData(projectId)} className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><span className="loader" /></div>
            ) : agents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No agents deployed.</p>
            ) : (
              <div className="space-y-2">
                {agents.map(agent => {
                  const scopes = agent.layers?.scopes || []
                  return (
                    <div key={agent.id} className="flex items-center gap-4 rounded-xl border border-border p-4 hover:border-primary/20 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center shrink-0">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded truncate max-w-[200px]">{agent.id}</code>
                          <button onClick={() => copyId(agent.id)} className="shrink-0">
                            {copiedId === agent.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Scopes</p>
                          <div className="flex gap-1">
                            {(['read', 'write', 'admin'] as const).map(scope => (
                              <label key={scope} className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted cursor-pointer">
                                <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleAgentScope(agent.id, scope, scopes)} className="w-3 h-3 accent-primary" />
                                <span className="text-[10px] font-semibold text-foreground capitalize">{scope}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">TTL</p>
                          <p className="text-xs font-semibold text-foreground">{ttlLabel}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Audit trail placeholder */}
          <div className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-kanit font-semibold mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" /> Audit Trail
            </h3>
            <p className="text-xs text-muted-foreground">
              Every tool call is logged with: agent ID, tool name, timestamp, acting-on-behalf-of user, result.
              View full audit in the Observability layer.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
