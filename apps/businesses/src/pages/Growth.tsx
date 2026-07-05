import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Brain,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  TrendingUp,
  Scissors,
  ListChecks,
  FlaskConical,
  Download,
  Share2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AppHeader } from '@/components/AppHeader'
import { growthApi, type AgentEntry, type GrowthDoc, type GrowthEvent, type GrowthStatus } from '@/lib/api'
import { generateGrowthPdf } from '@/utils/generateGrowthPdf'
import { ShareSheet } from '@/components/ShareSheet'

const STATUS_LABELS: Record<GrowthStatus, string> = {
  queued: 'Queued',
  gathering: 'Gathering business context',
  reasoning: 'Agents reasoning',
  synthesizing: 'Synthesizing strategies',
  critiquing: 'Critiquing',
  planning: 'Building final plan',
  complete: 'Complete',
  error: 'Error',
}

const AGENT_LABELS: Record<string, string> = {
  Analogical: 'Analogical',
  Inversion: 'Inversion',
  'Cross-Domain': 'Cross-Domain',
  Extreme: 'Extreme',
  Historical: 'Historical',
  Biomimicry: 'Biomimicry',
  Combinatorial: 'Combinatorial',
  Reduction: 'Reduction',
  Scaling: 'Scaling',
  'Future-Back': 'Future-Back',
}

export default function Growth() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()

  const [concept, setConcept] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doc, setDoc] = useState<GrowthDoc | null>(null)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [streamErr, setStreamErr] = useState<string | null>(null)
  const [softErrors, setSoftErrors] = useState<string[]>([])
  const unsubRef = useRef<null | (() => void)>(null)
  const feedRef = useRef<HTMLDivElement | null>(null)

  // Load doc when ?id is present
  useEffect(() => {
    if (!id) return
    let cancelled = false
    growthApi
      .get(id)
      .then((g) => {
        if (cancelled) return
        setDoc(g)
        if (g.status !== 'complete' && g.status !== 'error') subscribeStream(id)
      })
      .catch((err) => setError((err as Error).message))
    return () => {
      cancelled = true
      unsubRef.current?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const subscribeStream = (gid: string) => {
    unsubRef.current?.()
    setStreamErr(null)
    unsubRef.current = growthApi.stream(
      gid,
      (evt) => handleEvent(evt),
      (err) => setStreamErr(err.message),
    )
  }

  const handleEvent = (evt: GrowthEvent) => {
    setDoc((prev) => {
      if (!prev) return prev
      const next: GrowthDoc = { ...prev }
      switch (evt.type) {
        case 'status':
          next.status = evt.data.status as GrowthStatus
          break
        case 'context':
          next.contextLength = evt.data.contextLength
          next.sourceCounts = {
            uploads: evt.data.uploads,
            scrapes: evt.data.scrapes,
            chunks: evt.data.chunks,
          }
          break
        case 'agent_start':
          setActiveAgent(evt.data.lens)
          break
        case 'agent_output': {
          setActiveAgent(null)
          const entry = evt.data as AgentEntry
          next.agents = [...(next.agents || []), { ...entry, completedAt: new Date().toISOString() }]
          break
        }
        case 'agent_error': {
          setActiveAgent(null)
          const entry = evt.data as AgentEntry
          next.agents = [...(next.agents || []), entry]
          break
        }
        case 'synthesis':
          next.synthesis = evt.data.text
          break
        case 'critique':
          next.critique = evt.data.text
          break
        case 'plan':
          if (evt.data.plan && !evt.data.plan.error) next.plan = evt.data.plan
          break
        case 'synthesis_error':
          setSoftErrors((s) => [...s, `Synthesis failed: ${evt.data?.message || 'unknown'}`])
          break
        case 'critique_error':
          setSoftErrors((s) => [...s, `Critique failed: ${evt.data?.message || 'unknown'}`])
          break
        case 'plan_error':
          setSoftErrors((s) => [...s, `Final plan failed: ${evt.data?.message || 'unknown'}`])
          break
        case 'complete':
          next.status = 'complete'
          // Re-fetch authoritative doc to get the persisted plan
          growthApi.get(next.id).then((g) => setDoc(g)).catch(() => {})
          break
        case 'error':
          next.status = 'error'
          next.error = evt.data?.message
          break
      }
      return next
    })

    // Auto-scroll feed
    setTimeout(() => {
      feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  const onStart = async (e: FormEvent) => {
    e.preventDefault()
    if (concept.trim().length < 8) {
      setError('Describe your goal in at least 8 characters')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const g = await growthApi.start(concept.trim())
      setDoc(g)
      navigate(`/growth/${g.id}`, { replace: true })
      subscribeStream(g.id)
    } catch (err) {
      const r = (err as { response?: { status?: number; data?: { code?: string; message?: string } } }).response
      // Plan-limit hit → redirect to /pricing
      if (r?.status === 402 && r.data?.code === 'PLAN_LIMIT') {
        navigate('/pricing', { state: { from: { pathname: '/growth' }, reason: r.data.message } })
        return
      }
      setError(r?.data?.message || (err as Error).message || 'Failed to start')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {!doc ? (
          <NewAnalysisForm
            concept={concept}
            setConcept={setConcept}
            error={error}
            submitting={submitting}
            onStart={onStart}
          />
        ) : (
          <RunningOrComplete
            doc={doc}
            activeAgent={activeAgent}
            streamErr={streamErr}
            softErrors={softErrors}
            feedRef={feedRef}
          />
        )}
      </main>
    </div>
  )
}

function NewAnalysisForm({
  concept,
  setConcept,
  error,
  submitting,
  onStart,
}: {
  concept: string
  setConcept: (v: string) => void
  error: string | null
  submitting: boolean
  onStart: (e: FormEvent) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-3">Run an analysis</p>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
        What growth question should the agents answer?
      </h1>
      <p className="mt-3 text-muted-foreground max-w-2xl">
        Be specific. Examples: "Grow my SaaS from 50 to 500 paying customers in 12 months",
        "Reduce my paid-ads costs by 40% without dropping conversions", "Find a new revenue stream
        for my consultancy".
      </p>

      <form onSubmit={onStart} className="mt-8">
        <textarea
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          rows={5}
          placeholder="e.g. Grow my B2B SaaS for accountants from 50 to 500 paying customers in 12 months. We're at $8K MRR, 1 founder, currently relying on cold email."
          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary transition-colors text-foreground"
        />
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            10 reasoning agents will analyze + a synthesis + critique + structured plan. Takes
            roughly 90s–3min.
          </span>
          <button
            type="submit"
            disabled={submitting || concept.trim().length < 8}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Run analysis
          </button>
        </div>
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </motion.div>
  )
}

function RunningOrComplete({
  doc,
  activeAgent,
  streamErr,
  softErrors,
  feedRef,
}: {
  doc: GrowthDoc
  activeAgent: string | null
  streamErr: string | null
  softErrors: string[]
  feedRef: React.RefObject<HTMLDivElement>
}) {
  const isDone = doc.status === 'complete'
  const isErr = doc.status === 'error'
  const [shareOpen, setShareOpen] = useState(false)
  const [isPublic, setIsPublic] = useState(!!doc.isPublic)
  // Keep local toggle state in sync if doc reloads
  useEffect(() => {
    setIsPublic(!!doc.isPublic)
  }, [doc.isPublic])

  const onDownload = () => {
    generateGrowthPdf({ growth: doc })
  }
  const onTogglePublic = async (next: boolean) => {
    const r = await growthApi.setVisibility(doc.id, next)
    setIsPublic(r.isPublic)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <aside className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start space-y-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-primary/80 mb-2">Your goal</p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {doc.concept}
          </p>
          <div className="mt-5 pt-4 border-t border-border text-xs text-muted-foreground space-y-1.5">
            <div>
              Status: <span className="text-primary">{STATUS_LABELS[doc.status]}</span>
            </div>
            <div>
              Sources: {doc.sourceCounts.uploads} uploads · {doc.sourceCounts.scrapes} URLs ·{' '}
              {doc.sourceCounts.chunks} chunks
            </div>
            <div>Context: {doc.contextLength.toLocaleString()} chars</div>
            {doc.totalElapsedMs > 0 && (
              <div>Total: {(doc.totalElapsedMs / 1000).toFixed(1)}s</div>
            )}
          </div>
          {streamErr && (
            <div className="mt-4 text-xs text-red-400 flex items-start gap-1.5">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> {streamErr}
            </div>
          )}
          {softErrors.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {softErrors.map((m, i) => (
                <div key={i} className="text-xs text-amber-400 flex items-start gap-1.5">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{m}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isDone && (
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/80 mb-3">Export</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={onDownload}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
              <button
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Share
                {isPublic && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              {isPublic ? 'Public — anyone with link can view' : 'Private — only you'}
            </p>
          </div>
        )}

        {isDone && doc.plan?.title && <PlanCard plan={doc.plan as any} />}

        {shareOpen && (
          <ShareSheet
            growthId={doc.id}
            title={doc.plan?.title || doc.concept.slice(0, 80)}
            isPublic={isPublic}
            onClose={() => setShareOpen(false)}
            onTogglePublic={onTogglePublic}
          />
        )}
      </aside>

      <div className="lg:col-span-8 space-y-6">
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Live agent feed
          </h2>
          <div
            ref={feedRef}
            className="rounded-xl border border-border bg-muted divide-y divide-border max-h-[60vh] overflow-y-auto"
          >
            <AnimatePresence>
              {doc.agents.map((a) => (
                <AgentRow key={a.lens + a.completedAt} agent={a} />
              ))}
              {activeAgent && (
                <motion.div
                  key={`active-${activeAgent}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                  <span className="text-sm text-foreground">
                    {AGENT_LABELS[activeAgent] || activeAgent} agent thinking…
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            {!doc.agents.length && !activeAgent && (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                {doc.status === 'gathering'
                  ? 'Gathering business context…'
                  : 'Agents will appear here as they complete.'}
              </div>
            )}
          </div>
        </section>

        {doc.synthesis && (
          <section>
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Synthesis
            </h2>
            <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm font-semibold text-foreground">Top growth strategies</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {doc.synthesis}
              </p>
            </div>
          </section>
        )}

        {doc.critique && (
          <section>
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Critique
            </h2>
            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {doc.critique}
              </p>
            </div>
          </section>
        )}

        {isErr && doc.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Analysis failed</p>
                <p className="mt-1 text-red-300/90">{doc.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AgentRow({ agent }: { agent: AgentEntry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-5 py-4"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {agent.error ? (
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-semibold text-foreground">
            {AGENT_LABELS[agent.lens] || agent.lens}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{(agent.elapsedMs / 1000).toFixed(1)}s</span>
          {agent.provider && (
            <span className="px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
              {agent.provider}
            </span>
          )}
        </div>
      </div>
      {agent.error ? (
        <p className="text-xs text-red-500">{agent.error}</p>
      ) : (
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {agent.output}
        </p>
      )}
    </motion.div>
  )
}

function PlanCard({ plan }: { plan: GrowthDoc['plan'] }) {
  if (!plan?.title) return null
  const p = plan as Required<NonNullable<GrowthDoc['plan']>>
  return (
    <div className="rounded-xl bg-card border border-primary/20 p-4 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary/80 mb-2">Final plan</p>
        <h3 className="text-lg font-semibold text-foreground leading-snug">{p.title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{p.oneLiner}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <ScorePill icon={<Brain />} label="Novelty" score={p.noveltyScore} />
        <ScorePill icon={<TrendingUp />} label="Impact" score={p.impactScore} />
        <ScorePill icon={<ListChecks />} label="Feasible" score={p.feasibilityScore} />
      </div>

      {p.executionPlan?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Execution</p>
          <ol className="space-y-3">
            {p.executionPlan.map((ph: any, i: number) => (
              <li key={i} className="text-xs">
                <p className="text-primary font-semibold">{ph.phase}</p>
                <p className="text-muted-foreground">{ph.duration}</p>
                <ul className="mt-1.5 space-y-1 text-foreground">
                  {(ph.steps || []).map((s: string, j: number) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-muted-foreground">·</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}

      {p.costCutOpportunities?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-1.5">
            <Scissors className="h-3 w-3" /> Cost cuts
          </p>
          <ul className="space-y-1.5 text-xs">
            {p.costCutOpportunities.map((c: any, i: number) => (
              <li key={i} className="text-foreground">
                <span className="text-primary font-medium">{c.name}</span>
                {c.savings ? <span className="text-emerald-600"> · {c.savings}</span> : null}
                <p className="text-muted-foreground">{c.how}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.nextExperiments?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-1.5">
            <FlaskConical className="h-3 w-3" /> Week-1 experiments
          </p>
          <ul className="space-y-1 text-xs text-foreground">
            {p.nextExperiments.map((s: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">·</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.timeToFirstResults && (
        <div className="pt-3 border-t border-border text-xs text-muted-foreground">
          First results in <span className="text-primary">{p.timeToFirstResults}</span>
        </div>
      )}
    </div>
  )
}

function ScorePill({
  icon,
  label,
  score,
}: {
  icon: React.ReactNode
  label: string
  score: number
}) {
  const pct = Math.round((score || 0) * 100)
  return (
    <div className="rounded-lg bg-muted border border-border px-2 py-2">
      <div className="flex items-center justify-center gap-1.5 text-primary/80 [&>svg]:h-3 [&>svg]:w-3">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-base font-bold text-foreground">{pct}</p>
    </div>
  )
}
