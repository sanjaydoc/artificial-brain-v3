import { useState, useEffect, useCallback } from 'react'
import {
  Eye, RefreshCw, Download, Clock, Cpu, MessageSquare,
  AlertCircle, Wrench, Brain, ChevronDown, ChevronUp, Search, Filter,
} from 'lucide-react'
import { api } from '@/lib/api'
import { AppHeader } from '@/components/AppHeader'

const STEP_ICONS: Record<string, React.ReactNode> = {
  llm_call: <Cpu className="w-3.5 h-3.5 text-blue-500" />,
  tool_call: <Wrench className="w-3.5 h-3.5 text-teal-500" />,
  response: <MessageSquare className="w-3.5 h-3.5 text-green-500" />,
  decision: <Brain className="w-3.5 h-3.5 text-purple-500" />,
  error: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
  guardrail_check: <Eye className="w-3.5 h-3.5 text-yellow-500" />,
}

function formatTime(d: string) {
  return new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function RunRow({ run }: { run: any }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors">
        <div className={`w-3 h-3 rounded-full shrink-0 ${
          run.status === 'completed' ? 'bg-green-500' : run.status === 'failed' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{run.agentName}</span>
            <span className={`chip text-[9px] ${run.status === 'completed' ? 'chip-green' : run.status === 'failed' ? 'chip-red' : 'chip-cyan'}`}>
              {run.status}
            </span>
            <span className="chip chip-gray text-[9px]">{run.trigger}</span>
            <span className="text-[10px] text-muted-foreground">{run.steps?.length || 0} steps</span>
          </div>
          {run.input && <p className="text-xs text-muted-foreground truncate mt-0.5">{run.input.slice(0, 100)}</p>}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
          <Clock className="w-3 h-3" />{timeAgo(run.startedAt || run.createdAt)}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3 animate-fadeIn bg-muted/30">
          {/* Input */}
          {run.input && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Input</p>
              <div className="rounded-lg bg-card border border-border p-3 text-sm text-foreground whitespace-pre-wrap">{run.input}</div>
            </div>
          )}

          {/* Decision Replay — step-by-step trace */}
          {run.steps?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Decision Replay</p>
              <div className="relative ml-4">
                {/* Vertical timeline line */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />

                {run.steps.map((step: any, i: number) => (
                  <div key={i} className="relative pl-6 pb-4 last:pb-0">
                    {/* Timeline dot */}
                    <div className="absolute left-[-5px] top-1 w-[10px] h-[10px] rounded-full border-2 border-card bg-card flex items-center justify-center">
                      <div className={`w-2 h-2 rounded-full ${
                        step.type === 'error' ? 'bg-red-500' :
                        step.type === 'response' ? 'bg-green-500' :
                        step.type === 'llm_call' ? 'bg-blue-500' :
                        'bg-muted-foreground'
                      }`} />
                    </div>

                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {STEP_ICONS[step.type] || <Cpu className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className="text-xs font-bold text-foreground uppercase">{step.type.replace('_', ' ')}</span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(step.ts)}</span>
                        {step.tokenUsage > 0 && (
                          <span className="text-[10px] text-primary font-mono">{step.tokenUsage} tokens</span>
                        )}
                      </div>
                      {step.data && (
                        <pre className="text-[11px] text-muted-foreground font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto bg-muted rounded-md p-2">
                          {typeof step.data === 'string' ? step.data : JSON.stringify(step.data, null, 2)}
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
              <div className="rounded-lg bg-card border border-border p-3 text-sm text-foreground whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {run.output}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2 border-t border-border">
            <span>Run ID: <code className="font-mono">{run.id || run._id}</code></span>
            <span>Agent: <code className="font-mono">{run.agentId}</code></span>
            <span>Started: {formatTime(run.startedAt || run.createdAt)}</span>
            {run.completedAt && <span>Completed: {formatTime(run.completedAt)}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuditTrail() {
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [triggerFilter, setTriggerFilter] = useState('')

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/audit?limit=200')
      if (data.ok) setRuns(data.runs || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = runs.filter(run => {
    if (statusFilter && run.status !== statusFilter) return false
    if (triggerFilter && run.trigger !== triggerFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        (run.agentName || '').toLowerCase().includes(q) ||
        (run.input || '').toLowerCase().includes(q) ||
        (run.output || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const totalSteps = filtered.reduce((sum, r) => sum + (r.steps?.length || 0), 0)
  const totalTokens = filtered.reduce((sum, r) =>
    sum + (r.steps || []).reduce((s: number, st: any) => s + (st.tokenUsage || 0), 0), 0)

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `genesis-audit-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    const rows = [['Run ID', 'Agent', 'Status', 'Trigger', 'Input', 'Output', 'Steps', 'Started', 'Completed']]
    for (const r of filtered) {
      rows.push([
        r.id || r._id, r.agentName, r.status, r.trigger,
        `"${(r.input || '').replace(/"/g, '""').slice(0, 200)}"`,
        `"${(r.output || '').replace(/"/g, '""').slice(0, 200)}"`,
        String(r.steps?.length || 0),
        r.startedAt || '', r.completedAt || '',
      ])
    }
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `genesis-audit-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fadeIn">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Genesis Chamber</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Audit Trail</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {filtered.length} runs · {totalSteps} steps · {totalTokens.toLocaleString()} tokens
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button onClick={load} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <button onClick={exportJSON} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1" disabled={filtered.length === 0}>
              <Download className="w-3 h-3" /> JSON
            </button>
            <button onClick={exportCSV} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1" disabled={filtered.length === 0}>
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 animate-fadeIn">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search agent name, input, output..."
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm pl-10 outline-none focus:border-primary transition-colors" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="input-field text-sm w-auto">
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
            <option value="blocked">Blocked</option>
          </select>
          <select value={triggerFilter} onChange={e => setTriggerFilter(e.target.value)}
            className="input-field text-sm w-auto">
            <option value="">All Triggers</option>
            <option value="manual">Manual</option>
            <option value="api">API</option>
            <option value="schedule">Schedule</option>
            <option value="event">Event</option>
          </select>
        </div>

        {/* Runs list */}
        {loading ? (
          <div className="flex justify-center py-20"><span className="loader" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-xl border border-border animate-fadeIn">
            <Eye className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">No runs found</h2>
            <p className="text-sm text-muted-foreground">
              {runs.length === 0 ? 'Deploy and run agents to see audit data here.' : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 animate-fadeIn">
            {filtered.map(run => <RunRow key={run.id || run._id} run={run} />)}
          </div>
        )}
      </main>
    </div>
  )
}
