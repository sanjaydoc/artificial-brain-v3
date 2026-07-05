import { useState, useEffect, useCallback, useRef } from 'react'
import { Database, RefreshCw } from 'lucide-react'

interface Agent { id: string; name: string; status: string; layers?: { memoryType?: string[]; memoryQuota?: { short?: number; long?: number } } }
interface Project { id: string; name: string }

const AUTH = () => ({ Authorization: `Bearer ${localStorage.getItem('brain_token')}` })

export default function LayerMemory() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  const [defaultThreshold, setDefaultThreshold] = useState(0.6)
  const [defaultPruneAge, setDefaultPruneAge] = useState(300)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch projects on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/genesis/api/projects', { headers: AUTH() })
        const data = await r.json()
        if (data.ok) setProjects(data.projects || [])
      } catch {}
    })()
  }, [])

  // Load layer config + agents when project changes
  const loadProjectData = useCallback(async (projectId: string) => {
    if (!projectId) { setAgents([]); return }
    setLoading(true)
    try {
      const [layersRes, agentsRes] = await Promise.all([
        fetch(`/genesis/api/projects/${projectId}/layers`, { headers: AUTH() }),
        fetch(`/genesis/api/projects/${projectId}/agents`, { headers: AUTH() }),
      ])
      const layersData = await layersRes.json()
      const agentsData = await agentsRes.json()

      if (layersData.ok && layersData.layerConfig?.memory) {
        const mem = layersData.layerConfig.memory
        if (mem.mode) setMode(mem.mode)
        if (mem.defaultThreshold != null) setDefaultThreshold(mem.defaultThreshold)
        if (mem.defaultPruneAge != null) setDefaultPruneAge(mem.defaultPruneAge)
      }
      if (agentsData.ok) setAgents(agentsData.agents || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadProjectData(selectedProject) }, [selectedProject, loadProjectData])

  // Debounced save for global memory settings
  const saveLayerConfig = useCallback((m: string, threshold: number, pruneAge: number) => {
    if (!selectedProject) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/genesis/api/projects/${selectedProject}/layers`, {
          method: 'PUT',
          headers: { ...AUTH(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ memory: { mode: m, defaultThreshold: threshold, defaultPruneAge: pruneAge } }),
        })
      } catch {}
    }, 500)
  }, [selectedProject])

  const handleModeChange = (m: 'manual' | 'auto') => {
    setMode(m)
    saveLayerConfig(m, defaultThreshold, defaultPruneAge)
  }

  const handleThresholdChange = (v: number) => {
    setDefaultThreshold(v)
    saveLayerConfig(mode, v, defaultPruneAge)
  }

  const handlePruneAgeChange = (v: number) => {
    setDefaultPruneAge(v)
    saveLayerConfig(mode, defaultThreshold, v)
  }

  // Save per-agent memory settings
  const saveAgentLayers = useCallback(async (agentId: string, memoryType: string[], memoryQuota: { short?: number; long?: number }) => {
    try {
      await fetch(`/genesis/api/agents/${agentId}/layers`, {
        method: 'PUT',
        headers: { ...AUTH(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryType, memoryQuota }),
      })
    } catch {}
  }, [])

  const MEMORY_TYPES = ['short-term', 'long-term', 'episodic'] as const

  const toggleMemory = (agentId: string, type: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a
      const current = a.layers?.memoryType || ['short-term']
      const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type]
      const quota = a.layers?.memoryQuota || { short: 100, long: 50 }
      saveAgentLayers(agentId, next, quota)
      return { ...a, layers: { ...a.layers, memoryType: next } }
    }))
  }

  const updateAgentQuota = (agentId: string, field: 'short' | 'long', value: number) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a
      const memoryType = a.layers?.memoryType || ['short-term']
      const quota = { ...(a.layers?.memoryQuota || { short: 100, long: 50 }), [field]: value }
      saveAgentLayers(agentId, memoryType, quota)
      return { ...a, layers: { ...a.layers, memoryQuota: quota } }
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.7rem] font-medium text-muted-foreground mb-2">Layer 2</p>
        <h1 className="text-lg font-kanit font-semibold">Memory Config</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Per-agent memory assignment: short-term, long-term, episodic. Quotas and consolidation settings.
        </p>
      </div>

      {/* Project selector */}
      <div>
        <select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
        >
          <option value="">
            {projects.length === 0 ? 'No projects found' : 'Select a project to configure'}
          </option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!selectedProject ? (
        <p className="text-sm text-muted-foreground text-center py-8">Select a project to configure memory settings.</p>
      ) : (
        <>
          {/* Global settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-[0.7rem] font-medium text-muted-foreground mb-3">Mode</h3>
              <div className="flex gap-2">
                {(['manual', 'auto'] as const).map(m => (
                  <button key={m} onClick={() => handleModeChange(m)}
                    className={`flex-1 py-2.5 rounded-lg text-[0.75rem] font-semibold border transition-all ${
                      mode === m ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'
                    }`}>
                    {m === 'manual' ? 'Manual' : 'Automatic'}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-[0.7rem] font-medium text-muted-foreground mb-3">
                Consolidation Threshold: {defaultThreshold.toFixed(1)}
              </h3>
              <input type="range" min="0.1" max="1.0" step="0.1" value={defaultThreshold}
                onChange={e => handleThresholdChange(Number(e.target.value))}
                className="w-full accent-primary" />
              <p className="text-xs text-muted-foreground mt-2">Memories above this importance get promoted to long-term.</p>
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-[0.7rem] font-medium text-muted-foreground mb-3">
                Prune Age: {defaultPruneAge}s
              </h3>
              <input type="range" min="60" max="3600" step="60" value={defaultPruneAge}
                onChange={e => handlePruneAgeChange(Number(e.target.value))}
                className="w-full accent-primary" />
              <p className="text-xs text-muted-foreground mt-2">Low-importance memories older than this get pruned.</p>
            </div>
          </div>

          {/* Per-agent memory table */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-kanit font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> Per-Agent Memory Assignment
              </h3>
              <button onClick={() => loadProjectData(selectedProject)} className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><span className="loader" /></div>
            ) : agents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No agents deployed.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider py-2 px-3">Agent</th>
                      {MEMORY_TYPES.map(t => (
                        <th key={t} className="text-center text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider py-2 px-3">{t}</th>
                      ))}
                      <th className="text-center text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider py-2 px-3">Short Quota</th>
                      <th className="text-center text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider py-2 px-3">Long Quota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map(agent => {
                      const mem = agent.layers?.memoryType || ['short-term']
                      const quota = agent.layers?.memoryQuota || { short: 100, long: 50 }
                      return (
                        <tr key={agent.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                          <td className="py-3 px-3">
                            <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                            <p className="text-[10px] text-muted-foreground">{agent.status}</p>
                          </td>
                          {MEMORY_TYPES.map(t => (
                            <td key={t} className="text-center py-3 px-3">
                              <input type="checkbox" checked={mem.includes(t)}
                                onChange={() => toggleMemory(agent.id, t)}
                                className="w-4 h-4 accent-primary" disabled={mode === 'auto'} />
                            </td>
                          ))}
                          <td className="text-center py-3 px-3">
                            <input type="number" value={quota.short ?? 100} min={0}
                              onChange={e => updateAgentQuota(agent.id, 'short', Number(e.target.value))}
                              className="w-16 text-[0.65rem] font-mono text-foreground bg-input border border-border rounded-lg px-2 py-1 text-center outline-none focus:border-primary transition-colors" />
                          </td>
                          <td className="text-center py-3 px-3">
                            <input type="number" value={quota.long ?? 50} min={0}
                              onChange={e => updateAgentQuota(agent.id, 'long', Number(e.target.value))}
                              className="w-16 text-[0.65rem] font-mono text-foreground bg-input border border-border rounded-lg px-2 py-1 text-center outline-none focus:border-primary transition-colors" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
