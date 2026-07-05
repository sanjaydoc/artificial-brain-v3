import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain, Clock, RefreshCw, Play, Square, AlertCircle,
  CheckCircle, Loader, ChevronRight, Activity, Zap,
} from 'lucide-react'
import { api } from '@/lib/api'
import { AppHeader } from '@/components/AppHeader'

const STATUS_STYLES: Record<string, { dot: string; label: string; cls: string }> = {
  running: { dot: 'bg-green-500 animate-pulse', label: 'Running', cls: 'chip-green' },
  idle: { dot: 'bg-blue-400', label: 'Idle', cls: 'chip-cyan' },
  error: { dot: 'bg-red-500', label: 'Error', cls: 'chip-red' },
  stopped: { dot: 'bg-gray-400', label: 'Stopped', cls: 'chip-gray' },
  waiting_approval: { dot: 'bg-yellow-500 animate-pulse', label: 'Waiting', cls: 'chip-gold' },
}

function timeAgo(d: string | Date) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Runtime() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/runtime')
      if (data.ok) setAgents(data.agents || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [autoRefresh, load])

  const totalAgents = agents.length
  const runningCount = agents.filter(a => a.status === 'running').length
  const errorCount = agents.filter(a => a.status === 'error').length
  const idleCount = agents.filter(a => a.status === 'idle').length

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fadeIn">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Genesis Chamber</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Runtime Dashboard</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {totalAgents} agents · {runningCount} running · {errorCount} errors
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() => setAutoRefresh(a => !a)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                autoRefresh ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-card border-border text-muted-foreground'
              }`}
            >
              <Clock className="w-3 h-3" />
              {autoRefresh ? 'Auto 5s' : 'Paused'}
            </button>
            <button onClick={load}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 animate-fadeIn">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Agents</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalAgents}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Running</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{runningCount}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Idle</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{idleCount}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Errors</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{errorCount}</p>
          </div>
        </div>

        {/* Agent list */}
        {loading ? (
          <div className="flex justify-center py-20"><span className="loader" /></div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 animate-fadeIn">
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No agents deployed</h2>
            <p className="text-sm text-muted-foreground mb-4">Go to a project canvas and click Deploy to start agents.</p>
            <button onClick={() => navigate('/')} className="btn-primary px-6">Open Projects</button>
          </div>
        ) : (
          <div className="space-y-3 animate-fadeIn">
            {agents.map(agent => {
              const st = STATUS_STYLES[agent.status] || STATUS_STYLES.idle
              const lastRun = agent.lastRun
              return (
                <div key={agent.id}
                  onClick={() => navigate(`/runtime/${agent.id}`)}
                  className="rounded-xl bg-card border border-border p-4 cursor-pointer hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-4">
                    {/* Status dot + icon */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${st.dot}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
                        <span className={`chip text-[9px] ${st.cls}`}>{st.label}</span>
                        <span className="chip chip-gray text-[9px]">{agent.runtime?.type || 'on-demand'}</span>
                        <span className="chip chip-gray text-[9px]">P{agent.layers?.priority || 5}</span>
                      </div>

                      {agent.systemPrompt && (
                        <p className="text-xs text-muted-foreground truncate mb-2">{agent.systemPrompt.slice(0, 100)}</p>
                      )}

                      {/* Tools */}
                      {agent.toolPermissions?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {agent.toolPermissions.slice(0, 5).map((t: string) => (
                            <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 border border-teal-500/20">{t}</span>
                          ))}
                          {agent.toolPermissions.length > 5 && (
                            <span className="text-[9px] text-muted-foreground">+{agent.toolPermissions.length - 5} more</span>
                          )}
                        </div>
                      )}

                      {/* Last run info */}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        {lastRun ? (
                          <>
                            <span className="flex items-center gap-1">
                              {lastRun.status === 'completed' ? <CheckCircle className="w-3 h-3 text-green-500" /> :
                               lastRun.status === 'failed' ? <AlertCircle className="w-3 h-3 text-red-500" /> :
                               <Loader className="w-3 h-3 text-primary animate-spin" />}
                              Last run: {lastRun.status}
                            </span>
                            <span>Trigger: {lastRun.trigger}</span>
                            {lastRun.completedAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(lastRun.completedAt)}</span>}
                          </>
                        ) : (
                          <span>No runs yet</span>
                        )}
                      </div>

                      {/* Error */}
                      {agent.lastError && (
                        <p className="mt-1.5 text-xs text-red-500 bg-red-500/5 border border-red-500/10 rounded-lg px-2 py-1 truncate">{agent.lastError}</p>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
