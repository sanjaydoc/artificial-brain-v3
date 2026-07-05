import { useState, useEffect, useCallback } from 'react'
import { Eye, RefreshCw, Clock, Download, Cpu, MessageSquare, AlertCircle, Wrench, Brain } from 'lucide-react'

interface Project { id: string; name: string }

interface Run {
  _id: string
  agentId: string
  trigger: string
  input: string
  output: string
  status: string
  steps: { ts: string; type: string; data: any; tokenUsage: number }[]
  startedAt: string
  completedAt: string
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('brain_token')}`,
  'Content-Type': 'application/json',
})

const STEP_ICONS: Record<string, React.ReactNode> = {
  llm_call: <Cpu className="w-3 h-3 text-blue-500" />,
  tool_call: <Wrench className="w-3 h-3 text-teal-500" />,
  response: <MessageSquare className="w-3 h-3 text-green-500" />,
  decision: <Brain className="w-3 h-3 text-purple-500" />,
  error: <AlertCircle className="w-3 h-3 text-red-500" />,
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Observability() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [agents, setAgents] = useState<any[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch projects on mount
  const loadProjects = useCallback(async () => {
    try {
      const r = await fetch('/genesis/api/projects', { headers: authHeaders() })
      const data = await r.json()
      if (data.ok) setProjects(data.projects || [])
    } catch {} finally { setProjectsLoading(false) }
  }, [])

  // Fetch agents for a specific project
  const loadAgents = useCallback(async (pid: string) => {
    if (!pid) { setAgents([]); return }
    setLoading(true)
    try {
      const r = await fetch(`/genesis/api/projects/${pid}/agents`, { headers: authHeaders() })
      const data = await r.json()
      if (data.ok) setAgents(data.agents || [])
    } catch {} finally { setLoading(false) }
  }, [])

  const loadRuns = useCallback(async (agentId: string) => {
    if (!agentId) { setRuns([]); return }
    try {
      const r = await fetch(`/genesis/api/agents/${agentId}/runs?limit=50`, { headers: authHeaders() })
      const data = await r.json()
      if (data.ok) setRuns(data.runs || [])
    } catch {}
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  // When project changes, reset agent selection and load agents
  useEffect(() => {
    setSelectedAgent('')
    setRuns([])
    if (selectedProjectId) loadAgents(selectedProjectId)
    else setAgents([])
  }, [selectedProjectId, loadAgents])

  useEffect(() => { if (selectedAgent) loadRuns(selectedAgent) }, [selectedAgent, loadRuns])

  useEffect(() => {
    if (!autoRefresh || !selectedAgent) return
    const iv = setInterval(() => loadRuns(selectedAgent), 5000)
    return () => clearInterval(iv)
  }, [autoRefresh, selectedAgent, loadRuns])

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(runs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `genesis-runs-${selectedAgent}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  // Flatten all steps from all runs into a timeline
  const timeline = runs.flatMap(run =>
    (run.steps || []).map(step => ({
      ...step,
      runId: run._id,
      runStatus: run.status,
      runTrigger: run.trigger,
    }))
  ).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

  const totalTokens = timeline.reduce((sum, s) => sum + (s.tokenUsage || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.7rem] font-medium text-muted-foreground mb-2">Layer 5</p>
        <h1 className="text-lg font-kanit font-semibold">Observability</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Live log stream, agent timelines, decision replay, and log export.
        </p>
      </div>

      {/* Project Selector */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
          className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary transition-colors min-w-[200px]">
          <option value="">Select a project...</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {projectsLoading && <span className="text-xs text-muted-foreground">Loading projects...</span>}
      </div>

      {/* Controls */}
      {selectedProjectId && (
      <div className="flex flex-wrap gap-3 items-center">
        <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
          className="input-field text-sm w-auto min-w-[200px]">
          <option value="">Select an agent...</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name} ({a.status})</option>
          ))}
        </select>

        <button onClick={() => setAutoRefresh(a => !a)}
          className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold border transition-all flex items-center gap-1.5 ${
            autoRefresh ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-card border-border text-muted-foreground'
          }`}>
          <Clock className="w-3 h-3" />
          {autoRefresh ? 'Auto 5s' : 'Paused'}
        </button>

        <button onClick={() => loadRuns(selectedAgent)} className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>

        {runs.length > 0 && (
          <button onClick={exportLogs} className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1">
            <Download className="w-3 h-3" /> Export JSON
          </button>
        )}
      </div>
      )}

      {/* Stats */}
      {selectedAgent && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <p className="text-[0.7rem] font-medium text-muted-foreground mb-1">Total Runs</p>
            <p className="text-xl font-bold text-foreground">{runs.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-[0.7rem] font-medium text-muted-foreground mb-1">Total Steps</p>
            <p className="text-xl font-bold text-foreground">{timeline.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-[0.7rem] font-medium text-muted-foreground mb-1">Total Tokens</p>
            <p className="text-xl font-bold text-foreground">{totalTokens.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!selectedProjectId ? (
        <div className="text-center py-16 rounded-xl border border-border">
          <Eye className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Select a project above to get started.</p>
        </div>
      ) : !selectedAgent ? (
        <div className="text-center py-16 rounded-xl border border-border">
          <Eye className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Select an agent above to view its execution timeline.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20"><span className="loader" /></div>
      ) : timeline.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground">No execution steps recorded for this agent yet.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border p-4">
          <h3 className="text-sm font-kanit font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Execution Timeline ({timeline.length} steps)
          </h3>
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {timeline.map((step, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:border-primary/20 transition-all">
                <div className="mt-0.5 shrink-0">{STEP_ICONS[step.type] || <Cpu className="w-3 h-3 text-muted-foreground" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-foreground uppercase">{step.type.replace('_', ' ')}</span>
                    <span className="text-[9px] text-muted-foreground">{formatTime(step.ts)}</span>
                    {step.tokenUsage > 0 && <span className="text-[9px] text-muted-foreground">{step.tokenUsage} tok</span>}
                    <span className={`chip text-[8px] ${step.runStatus === 'completed' ? 'chip-green' : step.runStatus === 'failed' ? 'chip-red' : 'chip-gray'}`}>
                      {step.runTrigger}
                    </span>
                  </div>
                  {step.data && (
                    <pre className="text-[10px] text-muted-foreground font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all max-h-[100px] overflow-y-auto">
                      {typeof step.data === 'string' ? step.data : JSON.stringify(step.data, null, 2).slice(0, 300)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
