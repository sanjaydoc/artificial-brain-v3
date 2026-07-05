import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, ArrowUpDown, Zap, Cpu } from 'lucide-react'

interface Agent { id: string; name: string; status: string; layers?: { priority?: number }; runtime?: { type?: string } }
interface Project { id: string; name: string }

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('brain_token')}`,
  'Content-Type': 'application/json',
})

export default function Orchestrator() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [projectsLoading, setProjectsLoading] = useState(true)

  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  const [maxConcurrent, setMaxConcurrent] = useState(3)
  const [maxTokensPerMin, setMaxTokensPerMin] = useState(10000)

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

      if (layersData.ok && layersData.layerConfig?.orchestrator) {
        const o = layersData.layerConfig.orchestrator
        if (o.mode) setMode(o.mode)
        if (o.maxConcurrent != null) setMaxConcurrent(o.maxConcurrent)
        if (o.maxTokensPerMin != null) setMaxTokensPerMin(o.maxTokensPerMin)
      }
      if (agentsData.ok) setAgents(agentsData.agents || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadProjectData(projectId) }, [projectId, loadProjectData])

  // Debounced save for orchestrator config
  const saveOrchestratorConfig = useCallback((m: string, mc: number, mt: number) => {
    if (!projectId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/genesis/api/projects/${projectId}/layers`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ orchestrator: { mode: m, maxConcurrent: mc, maxTokensPerMin: mt } }),
        })
      } catch {}
    }, 500)
  }, [projectId])

  // Trigger save when config values change (skip if no project selected)
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return }
    saveOrchestratorConfig(mode, maxConcurrent, maxTokensPerMin)
  }, [mode, maxConcurrent, maxTokensPerMin, saveOrchestratorConfig])

  // Reset the initial-mount guard when project changes so we don't save the loaded values back
  useEffect(() => { isInitialMount.current = true }, [projectId])

  const updatePriority = async (agentId: string, priority: number) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, layers: { ...a.layers, priority } } : a))
    try {
      await fetch(`/genesis/api/agents/${agentId}/layers`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ priority }),
      })
    } catch {}
  }

  const sorted = [...agents].sort((a, b) => (b.layers?.priority || 5) - (a.layers?.priority || 5))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.7rem] font-medium text-muted-foreground mb-2">Layer 1</p>
        <h1 className="text-lg font-kanit font-semibold">Orchestrator</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Priority allocation, resource limits, and queue management for running agents.
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
          {/* Mode toggle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-[0.7rem] font-medium text-muted-foreground mb-3">Allocation Mode</h3>
              <div className="flex gap-2">
                {(['manual', 'auto'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2.5 rounded-lg text-[0.75rem] font-semibold border transition-all ${
                      mode === m ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'
                    }`}>
                    {m === 'manual' ? 'Manual' : 'Automatic'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {mode === 'manual' ? 'You set priority per agent using the table below.' : 'Orchestrator auto-assigns priority based on agent type and urgency.'}
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-[0.7rem] font-medium text-muted-foreground mb-3">Max Concurrent LLM Calls</h3>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="10" value={maxConcurrent} onChange={e => setMaxConcurrent(Number(e.target.value))}
                  className="flex-1 accent-primary" />
                <span className="text-lg font-bold text-foreground w-8 text-center">{maxConcurrent}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Agents queue when this limit is reached. Higher priority goes first.</p>
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-[0.7rem] font-medium text-muted-foreground mb-3">Max Tokens / Minute</h3>
              <div className="flex items-center gap-3">
                <input type="range" min="1000" max="50000" step="1000" value={maxTokensPerMin} onChange={e => setMaxTokensPerMin(Number(e.target.value))}
                  className="flex-1 accent-primary" />
                <span className="text-sm font-bold text-foreground w-16 text-right">{(maxTokensPerMin / 1000).toFixed(0)}k</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Global token rate limit across all agents.</p>
            </div>
          </div>

          {/* Priority table */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-kanit font-semibold flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-primary" /> Agent Priority Table
              </h3>

              <button onClick={() => loadProjectData(projectId)} className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><span className="loader" /></div>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No agents deployed. Deploy agents from the Genesis canvas first.</p>
            ) : (
              <div className="space-y-2">
                {sorted.map((agent, i) => {
                  const priority = agent.layers?.priority || 5
                  return (
                    <div key={agent.id} className="flex items-center gap-4 rounded-xl border border-border p-3 hover:border-primary/20 transition-all">
                      <span className="text-xs text-muted-foreground font-mono w-6 text-center">{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 grid place-items-center shrink-0">
                        <Cpu className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{agent.runtime?.type || 'on-demand'}</span>
                          <span className={`chip text-[9px] ${agent.status === 'running' ? 'chip-green' : agent.status === 'error' ? 'chip-red' : 'chip-gray'}`}>
                            {agent.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">Priority:</span>
                        <input type="range" min="1" max="10" value={priority}
                          onChange={e => updatePriority(agent.id, Number(e.target.value))}
                          className="w-20 accent-primary" disabled={mode === 'auto'} />
                        <span className="text-sm font-bold text-primary w-6 text-center">{priority}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Rules (auto mode) */}
          {mode === 'auto' && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
              <h3 className="text-sm font-kanit font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Auto-Priority Rules
              </h3>
              <div className="space-y-2">
                {[
                  { rule: 'Always-on agents handling live input', priority: 10 },
                  { rule: 'On-demand agents triggered by API/webhook', priority: 8 },
                  { rule: 'Scheduled background agents', priority: 4 },
                  { rule: 'Event-triggered follow-up agents', priority: 6 },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-xs text-foreground">{r.rule}</span>
                    <span className="text-xs font-bold text-primary">P{r.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
