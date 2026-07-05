import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Brain, ArrowLeft, Send, Loader, Clock, CheckCircle, AlertCircle,
  XCircle, RefreshCw, ChevronDown, ChevronUp, Cpu, Wrench, MessageSquare, ShieldAlert,
} from 'lucide-react'
import { api } from '@/lib/api'
import { AppHeader } from '@/components/AppHeader'

const STATUS_STYLES: Record<string, { cls: string; label: string }> = {
  running: { cls: 'chip-green', label: 'Running' },
  idle: { cls: 'chip-cyan', label: 'Idle' },
  error: { cls: 'chip-red', label: 'Error' },
  stopped: { cls: 'chip-gray', label: 'Stopped' },
  completed: { cls: 'chip-green', label: 'Completed' },
  failed: { cls: 'chip-red', label: 'Failed' },
  blocked: { cls: 'chip-gold', label: 'Blocked' },
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  llm_call: <Cpu className="w-3 h-3 text-blue-500" />,
  tool_call: <Wrench className="w-3 h-3 text-teal-500" />,
  response: <MessageSquare className="w-3 h-3 text-green-500" />,
  decision: <Brain className="w-3 h-3 text-purple-500" />,
  error: <AlertCircle className="w-3 h-3 text-red-500" />,
  guardrail_check: <ShieldAlert className="w-3 h-3 text-yellow-500" />,
}

function timeAgo(d: string | Date) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatTime(d: string | Date) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function RunCard({ run }: { run: any }) {
  const [expanded, setExpanded] = useState(false)
  const st = STATUS_STYLES[run.status] || STATUS_STYLES.idle

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors">
        <div className="shrink-0">
          {run.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
           run.status === 'failed' ? <XCircle className="w-5 h-5 text-red-500" /> :
           run.status === 'running' ? <Loader className="w-5 h-5 text-primary animate-spin" /> :
           <Clock className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`chip text-[9px] ${st.cls}`}>{st.label}</span>
            <span className="chip chip-gray text-[9px]">{run.trigger}</span>
            <span className="text-[10px] text-muted-foreground">{run.steps?.length || 0} steps</span>
          </div>
          {run.input && <p className="text-xs text-foreground truncate">{run.input}</p>}
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span>{formatTime(run.startedAt || run.createdAt)}</span>
            {run.completedAt && <span>· {timeAgo(run.completedAt)}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3 animate-fadeIn">
          {/* Input */}
          {run.input && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Input</p>
              <div className="rounded-lg bg-muted border border-border p-3 text-sm text-foreground">{run.input}</div>
            </div>
          )}

          {/* Steps timeline */}
          {run.steps?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Execution Trace</p>
              <div className="space-y-1.5">
                {run.steps.map((step: any, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
                    <div className="mt-0.5 shrink-0">{STEP_ICONS[step.type] || <Cpu className="w-3 h-3 text-muted-foreground" />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold text-foreground uppercase">{step.type.replace('_', ' ')}</span>
                        <span className="text-[9px] text-muted-foreground">{formatTime(step.ts)}</span>
                        {step.tokenUsage > 0 && <span className="text-[9px] text-muted-foreground">{step.tokenUsage} tokens</span>}
                      </div>
                      {step.data && (
                        <pre className="text-[11px] text-muted-foreground font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                          {typeof step.data === 'string' ? step.data : JSON.stringify(step.data, null, 2).slice(0, 500)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output */}
          {run.output && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Output</p>
              <div className="rounded-lg bg-muted border border-border p-3 text-sm text-foreground whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {run.output}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AgentDetail() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()

  const [agent, setAgent] = useState<any>(null)
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    if (!agentId) return
    try {
      const [agentsRes, runsRes] = await Promise.all([
        api.get('/runtime'),
        api.get(`/agents/${agentId}/runs?limit=50`),
      ])
      if (agentsRes.data.ok) {
        const found = agentsRes.data.agents.find((a: any) => a.id === agentId)
        if (found) setAgent(found)
      }
      if (runsRes.data.ok) setRuns(runsRes.data.runs || [])
    } catch {} finally { setLoading(false) }
  }, [agentId])

  useEffect(() => { load() }, [load])

  const handleRun = async () => {
    if (!agentId || !input.trim()) return
    setRunning(true)
    try {
      await api.post(`/agents/${agentId}/run`, { input: input.trim(), trigger: 'manual' })
      setInput('')
      await load()
    } catch {} finally { setRunning(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader />
        <div className="flex justify-center py-20"><span className="loader" /></div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 text-center">
          <p className="text-muted-foreground">Agent not found</p>
          <button onClick={() => navigate('/runtime')} className="btn-primary mt-4 px-6">Back to Runtime</button>
        </div>
      </div>
    )
  }

  const st = STATUS_STYLES[agent.status] || STATUS_STYLES.idle
  const totalRuns = runs.length
  const completedRuns = runs.filter(r => r.status === 'completed').length
  const failedRuns = runs.filter(r => r.status === 'failed').length

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {/* Back + header */}
        <div className="flex items-start gap-4 mb-8 animate-fadeIn">
          <button onClick={() => navigate('/runtime')} className="p-2 rounded-lg hover:bg-accent transition-colors mt-1">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Agent Detail</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{agent.name}</h1>
              <span className={`chip ${st.cls}`}>{st.label}</span>
              <span className="chip chip-gray">{agent.runtime?.type || 'on-demand'}</span>
            </div>
            {agent.systemPrompt && (
              <p className="mt-2 text-muted-foreground text-sm">{agent.systemPrompt.slice(0, 200)}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Agent info + run trigger */}
          <div className="space-y-5">
            {/* Stats */}
            <div className="rounded-xl bg-card border border-border p-4 space-y-3">
              <h3 className="text-sm font-kanit font-semibold">Stats</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{totalRuns}</p>
                  <p className="text-[10px] text-muted-foreground">Total Runs</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-600">{completedRuns}</p>
                  <p className="text-[10px] text-muted-foreground">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-600">{failedRuns}</p>
                  <p className="text-[10px] text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>

            {/* Config */}
            <div className="rounded-xl bg-card border border-border p-4 space-y-3">
              <h3 className="text-sm font-kanit font-semibold">Configuration</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="text-foreground font-medium">{agent.llmConfig?.mode || 'simple'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Temperature</span><span className="text-foreground font-medium">{agent.llmConfig?.temperature ?? 0.7}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Max Tokens</span><span className="text-foreground font-medium">{agent.llmConfig?.maxTokens ?? 2048}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className="text-foreground font-medium">{agent.layers?.priority || 5}/10</span></div>
              </div>
            </div>

            {/* Tools */}
            {agent.toolPermissions?.length > 0 && (
              <div className="rounded-xl bg-card border border-border p-4 space-y-3">
                <h3 className="text-sm font-kanit font-semibold">
                  Tools ({agent.toolPermissions.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {agent.toolPermissions.map((t: string) => (
                    <span key={t} className="text-[10px] font-mono px-2 py-1 rounded-lg bg-teal-500/10 text-teal-600 border border-teal-500/20">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Run trigger */}
            <div className="rounded-xl bg-card border border-primary/20 bg-primary/[0.02] p-4">
              <h3 className="text-sm font-kanit font-semibold mb-3">Run Agent</h3>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRun() } }}
                placeholder="Enter input for this agent..."
                className="input-field text-sm resize-none min-h-[80px] mb-3"
              />
              <button onClick={handleRun} disabled={running || !input.trim()}
                className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
                {running ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {running ? 'Running...' : 'Run Now'}
              </button>
            </div>
          </div>

          {/* Right: Run history */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-kanit font-semibold">Run History ({totalRuns})</h3>
              <button onClick={load} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {runs.length === 0 ? (
              <div className="text-center py-16 rounded-xl border border-border">
                <Brain className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No runs yet. Use the panel on the left to trigger a run.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {runs.map(run => (
                  <RunCard key={run._id || run.id} run={run} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
