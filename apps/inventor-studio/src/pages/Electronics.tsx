import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Zap, ChevronRight, Cpu, Trash2,
  Clock, CircuitBoard, Radio, Layers, Lightbulb, ArrowRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { AppHeader } from '@/components/AppHeader'

const electronicsGenerate = (payload: { concept: string; inventionId?: string }) =>
  api.post('/electronics', payload, { timeout: 180000 })
const electronicsList = () => api.get('/electronics')
const electronicsDelete = (id: string) => api.delete(`/electronics/${id}`)
const getInventions = () => api.get('/inventions')

const timeAgo = (d: string | Date) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const CAT_COLOR: Record<string, string> = {
  MCU: '#3b82f6', SENSOR: '#14b8a6', ACTUATOR: '#eab308',
  POWER: '#f97316', MODULE: '#a855f7', DISPLAY: '#22c55e',
}

const SUGGESTIONS = [
  { icon: Radio,        label: 'Micro racing drone' },
  { icon: Layers,       label: 'Line follower robot' },
  { icon: Cpu,          label: 'Smart door lock' },
  { icon: CircuitBoard, label: 'LED matrix controller' },
  { icon: Lightbulb,    label: 'Temperature data logger' },
]

const progressLabels: [number, string][] = [
  [0, 'Initializing...'],
  [15, 'Analyzing concept...'],
  [30, 'Querying knowledge graph...'],
  [45, 'Designing circuit topology...'],
  [60, 'Selecting components...'],
  [75, 'Routing connections...'],
  [88, 'Finalizing layout...'],
  [98, 'Almost ready...'],
]

export default function Electronics() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const prefillId = params.get('inventionId') || ''
  const prefillConcept = params.get('concept') || ''

  const [tab, setTab] = useState<'new' | 'invention'>(prefillId ? 'invention' : 'new')
  const [concept, setConcept] = useState(prefillConcept)
  const [inventions, setInventions] = useState<any[]>([])
  const [selInvention, setSelInvention] = useState(prefillId)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [circuits, setCircuits] = useState<any[]>([])
  const [deleting, setDeleting] = useState('')

  useEffect(() => {
    electronicsList().then((r: any) => setCircuits(r.data?.circuits || r.data || [])).catch(() => {})
    getInventions().then((r: any) => setInventions(r.data?.inventions || r.data || [])).catch(() => {})
  }, [])

  const startProgress = () => {
    setProgress(0)
    let current = 0
    progressTimer.current = setInterval(() => {
      const inc = current < 30 ? 4 : current < 55 ? 3 : current < 75 ? 1.5 : current < 88 ? 0.5 : 0
      current = Math.min(90, current + inc)
      setProgress(Math.round(current))
    }, 400)
  }

  const stopProgress = (success: boolean) => {
    if (progressTimer.current) clearInterval(progressTimer.current)
    setProgress(success ? 100 : 0)
  }

  const handleGenerate = async () => {
    setError('')
    const sel = inventions.find((i) => i.id === selInvention)
    const finalConcept =
      tab === 'invention'
        ? (sel?.title || sel?.seed_concept || sel?.seedConcept || '')
        : concept.trim()
    if (!finalConcept) {
      setError('Please describe a project or pick an invention.')
      return
    }
    setGenerating(true)
    startProgress()
    try {
      const payload: { concept: string; inventionId?: string } = { concept: finalConcept }
      if (tab === 'invention' && selInvention) payload.inventionId = selInvention
      const { data } = await electronicsGenerate(payload)
      stopProgress(true)
      setTimeout(() => navigate(`/electronics/${data.circuitId || data.id}`), 300)
    } catch (e: any) {
      stopProgress(false)
      setError(e?.response?.data?.message || 'Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleting(id)
    try {
      await electronicsDelete(id)
      setCircuits((prev) => prev.filter((c) => c.id !== id))
    } catch {} finally {
      setDeleting('')
    }
  }

  const progressLabel = progressLabels.reduce(
    (acc, [t, l]) => (progress >= t ? l : acc),
    'Initializing...',
  )

  const canGenerate = !generating && (tab === 'new' ? concept.trim().length > 0 : !!selInvention)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      {/* Generating overlay */}
      {generating && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8">
          <div className="relative w-[130px] h-[130px]">
            <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="65" cy="65" r="54" fill="none" stroke="var(--border)" strokeWidth="6" />
              <circle cx="65" cy="65" r="54" fill="none"
                stroke="var(--primary)" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-primary">{progress}%</span>
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest mt-1">PROGRESS</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-base font-bold text-foreground mb-2">Generating Circuit Diagram</p>
            <p className="text-xs text-muted-foreground">{progressLabel}</p>
          </div>

          <div className="w-[260px]">
            <div className="score-bar">
              <div className="score-fill-gold" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {/* Page header */}
        <div className="mb-8 animate-fadeIn">
          <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">ASI-1 · Electronics & Robotics</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Circuit <span className="gradient-text">Generator</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Form */}
          <div className="lg:col-span-2 space-y-5 animate-fadeIn">
            {/* Tab selector */}
            <div className="flex gap-3">
              {[
                { id: 'new' as const,       label: 'New Idea',       Icon: Zap         },
                { id: 'invention' as const, label: 'From Invention', Icon: CircuitBoard },
              ].map(({ id, label, Icon }) => {
                const active = tab === id
                return (
                  <button key={id} onClick={() => setTab(id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border ${
                      active
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-card border-border text-muted-foreground hover:border-primary/20'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Input panel */}
            <div className="rounded-xl bg-card border border-border p-4">
              {tab === 'new' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Describe your project</p>
                      <p className="text-xs text-muted-foreground">ASI-1 will design the full circuit</p>
                    </div>
                  </div>

                  <textarea
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate() }}
                    placeholder={'e.g. Micro racing drone with ESCs and flight controller\ne.g. Arduino soil moisture auto-watering system\ne.g. ESP32 Bluetooth speaker with amplifier'}
                    rows={4}
                    className="input-field resize-none leading-relaxed"
                  />

                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold">Quick starts</p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTIONS.map(({ icon: Icon, label }) => (
                        <button key={label} onClick={() => setConcept(label)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-muted border border-border text-primary font-medium hover:border-primary/30 transition-all">
                          <Icon className="w-3 h-3" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <CircuitBoard className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Pick an invention</p>
                      <p className="text-xs text-muted-foreground">Generate circuit from your saved ideas</p>
                    </div>
                  </div>

                  {inventions.length === 0 ? (
                    <div className="py-8 text-center flex flex-col items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">No inventions found. Generate one first.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[260px] overflow-y-auto">
                      {inventions.map((inv) => {
                        const sel = selInvention === inv.id
                        return (
                          <button key={inv.id} onClick={() => setSelInvention(inv.id)}
                            className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all border ${
                              sel ? 'border-primary/30 bg-primary/[0.06]' : 'border-border hover:border-primary/20'
                            }`}>
                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                              sel ? 'bg-primary/15' : 'bg-muted'
                            }`}>
                              <Cpu className={`w-3.5 h-3.5 ${sel ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${sel ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {inv.title || inv.seed_concept || inv.seedConcept}
                              </p>
                              {inv.domain && <p className="text-[10px] text-muted-foreground mt-0.5">{inv.domain}</p>}
                            </div>
                            {sel && <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-sm text-destructive">
                  <span className="shrink-0">!</span>
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="btn-primary w-full py-3.5 text-sm mt-5 flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                Generate Circuit Diagram
              </button>
            </div>
          </div>

          {/* Right column — My Circuits */}
          <div className="animate-fadeIn">
            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                My Circuits <span className="text-muted-foreground font-normal">· {circuits.length}</span>
              </h3>

              {circuits.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <CircuitBoard className="w-6 h-6 text-primary/50" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">No circuits yet</p>
                  <p className="text-xs text-muted-foreground">Generate your first circuit diagram</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {circuits.map((c) => {
                    const bom = c.bom || []
                    const cats: string[] = bom.length
                      ? (Array.from(new Set(bom.map((x: any) => x.category).filter(Boolean))) as string[]).slice(0, 4)
                      : []
                    return (
                      <div key={c.id}
                        onClick={() => navigate(`/electronics/${c.id}`)}
                        className="rounded-xl border border-border p-3 cursor-pointer hover:border-primary/30 transition-all flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <CircuitBoard className="w-[18px] h-[18px] text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate mb-1">{c.title}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {timeAgo(c.createdAt)}
                            </span>
                            {bom.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">{bom.length} parts</span>
                            )}
                            {c.isPublic && (
                              <span className="chip chip-green" style={{ padding: '1px 6px', fontSize: 9 }}>SHARED</span>
                            )}
                          </div>
                          {cats.length > 0 && (
                            <div className="flex gap-2 mt-1.5">
                              {cats.map((cat) => (
                                <div key={cat} className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: CAT_COLOR[cat] || '#6b7280' }} />
                                  <span className="text-[9px] text-muted-foreground">{cat}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => handleDelete(c.id, e)}
                            disabled={deleting === c.id}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                            {deleting === c.id
                              ? <span className="spinner" style={{ width: 12, height: 12 }} />
                              : <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />}
                          </button>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
