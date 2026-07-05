import { useState, useEffect, useCallback } from 'react'
import { Shield, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { AppHeader } from '@/components/AppHeader'

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Approvals() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [deciding, setDeciding] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const params = filter === 'pending' ? '?status=pending' : ''
      const { data } = await api.get(`/approvals${params}`)
      if (data.ok) setApprovals(data.approvals || [])
    } catch {} finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  // Auto-refresh for pending
  useEffect(() => {
    if (filter !== 'pending') return
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [filter, load])

  const decide = async (id: string, decision: 'approved' | 'denied') => {
    setDeciding(id)
    try {
      await api.post(`/approvals/${id}/decide`, { decision })
      setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: decision, decidedAt: new Date().toISOString() } : a))
    } catch {} finally { setDeciding(null) }
  }

  const pendingCount = approvals.filter(a => a.status === 'pending').length

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fadeIn">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Genesis Chamber</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Approval Queue
              {pendingCount > 0 && (
                <span className="ml-3 text-lg font-normal text-yellow-600 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-3 py-0.5">
                  {pendingCount} pending
                </span>
              )}
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Human-in-the-loop approvals for actions that exceed governance thresholds.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${filter === 'pending' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                Pending
              </button>
              <button onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${filter === 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                All
              </button>
            </div>
            <button onClick={load} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><span className="loader" /></div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-20 rounded-xl border border-border animate-fadeIn">
            <Shield className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {filter === 'pending' ? 'No pending approvals' : 'No approvals yet'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filter === 'pending' ? 'All agent actions are within governance thresholds.' : 'Approvals appear when agents hit governance thresholds.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 animate-fadeIn">
            {approvals.map(approval => (
              <div key={approval.id}
                className={`rounded-xl border p-4 transition-all ${
                  approval.status === 'pending' ? 'border-yellow-500/30 bg-yellow-500/[0.02]' :
                  approval.status === 'approved' ? 'border-green-500/20 bg-green-500/[0.02]' :
                  'border-red-500/20 bg-red-500/[0.02]'
                }`}>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">
                    {approval.status === 'pending' ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> :
                     approval.status === 'approved' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                     <XCircle className="w-5 h-5 text-red-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`chip text-[9px] ${
                        approval.status === 'pending' ? 'chip-gold' :
                        approval.status === 'approved' ? 'chip-green' : 'chip-red'
                      }`}>{approval.status}</span>
                      <span className="text-sm font-semibold text-foreground">{approval.action}</span>
                      {approval.threshold && (
                        <span className="text-xs text-muted-foreground">Threshold: <strong className="text-foreground">{approval.threshold}</strong></span>
                      )}
                    </div>

                    {approval.context && (
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">{approval.context}</p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(approval.createdAt)}</span>
                      {approval.notifiedVia?.length > 0 && <span>Notified: {approval.notifiedVia.join(', ')}</span>}
                      {approval.decidedAt && <span>Decided: {timeAgo(approval.decidedAt)}</span>}
                    </div>
                  </div>

                  {approval.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => decide(approval.id, 'approved')} disabled={deciding === approval.id}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20 transition-colors flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => decide(approval.id, 'denied')} disabled={deciding === approval.id}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Deny
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
