// Ported from: inventor-studio-react-app/src/pages/GuestStream.jsx (745 lines).
// Preserves visual design, audio, SSE protocol, all sections.
// Backend SSE: GET /api/stream/:id (supports /api/stream/invention/:id alias).
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Zap, ArrowRight, FileText, Brain, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Sparkles, Cpu, ExternalLink, Package, Database, AlertTriangle, X,
} from 'lucide-react'
import { generateInventionPdf } from '@/utils/generatePdf'
import PrototypeCanvas from '@/components/PrototypeCanvas'
import { api } from '@/lib/api'

interface Lens {
  id: string
  label: string
  color: string
}

const LENSES: Lens[] = [
  { id: 'analogical',    label: 'Analogical',         color: '#34d399' },
  { id: 'inversion',     label: 'Inversion',          color: '#f87171' },
  { id: 'crossDomain',   label: 'Cross-Domain',       color: '#00d4ff' },
  { id: 'extreme',       label: 'Extreme Constraints', color: '#fb923c' },
  { id: 'historical',    label: 'Historical',         color: '#facc15' },
  { id: 'biomimicry',    label: 'Biomimicry',         color: '#a3e635' },
  { id: 'combinatorial', label: 'Combinatorial',      color: '#f472b6' },
  { id: 'reduction',     label: 'Reduction',          color: '#38bdf8' },
  { id: 'scaling',       label: 'Scaling',            color: '#818cf8' },
  { id: 'future',        label: 'Future-Back',        color: '#a78bfa' },
]

const LENS_COLORS: Record<string, string> = {
  analogical:    'text-emerald-400',
  inversion:     'text-red-400',
  crossDomain:   'text-cyan-400',
  extreme:       'text-orange-400',
  historical:    'text-yellow-400',
  biomimicry:    'text-lime-400',
  combinatorial: 'text-pink-400',
  reduction:     'text-sky-400',
  scaling:       'text-indigo-400',
  future:        'text-violet-400',
}

const PHASE_LABELS: Record<string, string> = {
  starting: 'Initializing ASI...',
  searching: 'Searching research databases...',
  reading: 'Reading top sources...',
  dreaming: '10 dream agents awakening...',
  synthesizing: 'Synthesizing outputs...',
  critiquing: 'Critic evaluating novelty...',
  generating_mvp: 'Generating MVP specification...',
  generating_canvas: 'Building prototype layout...',
  complete: 'Invention complete!',
}

/* ── Agent card ─────────────────────────────────────────────── */
function AgentCard({ lens, output, isActive }: { lens: Lens; output?: string; isActive: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const isPending = !isActive && !output
  const color = isPending ? 'text-muted-foreground' : (LENS_COLORS[lens.id] || 'text-muted-foreground')
  return (
    <div className={`glass-card overflow-hidden transition-all ${isActive ? 'border-primary/20' : ''} ${isPending ? 'opacity-40' : ''}`}>
      <button onClick={() => output && setExpanded(!expanded)} className={`w-full p-3.5 flex items-center gap-3 text-left ${output ? '' : 'cursor-default'}`}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive && !output ? 'dream-pulse bg-primary' : output ? 'bg-green-400' : 'bg-gray-700'}`} />
        <span className={`font-head text-sm font-semibold flex-1 ${color}`}>{lens.label}</span>
        {output && (expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
        {isActive && !output && <span className="spinner-cyan" />}
      </button>
      {output && expanded && <div className="px-4 pb-4 animate-fadeIn"><p className="text-muted-foreground text-xs leading-relaxed">{output}</p></div>}
    </div>
  )
}

/* ── Score bar ──────────────────────────────────────────────── */
function ScoreBar({ label, value, colorClass }: { label: string; value?: number; colorClass: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="text-xs font-head font-bold text-foreground">{Math.round((value || 0) * 100)}%</span>
      </div>
      <div className="score-bar"><div className={`score-fill-${colorClass}`} style={{ width: `${(value || 0) * 100}%` }} /></div>
    </div>
  )
}

/* ── Enriched step renderer ─────────────────────────────────── */
function EnrichedStepView({ step }: { step: any }) {
  if (!step || step.type === 'process') return null
  return (
    <div className="ml-8 mt-2 space-y-2">
      {step.commands?.length > 0 && (
        <pre className="text-xs text-green-400 bg-muted p-3 rounded-xl overflow-x-auto leading-relaxed border border-green-500/10 whitespace-pre-wrap">{step.commands.join('\n\n')}</pre>
      )}
      {step.packages?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {step.packages.map((pkg: any, i: number) => (
            <a key={i} href={pkg.link} target="_blank" rel="noreferrer" title={pkg.description}
              className="flex items-center gap-1 chip chip-cyan text-xs hover:opacity-80 transition-opacity">
              <Package className="w-3 h-3" />
              <span>{pkg.ecosystem !== 'other' ? `${pkg.ecosystem}:` : ''}{pkg.name}</span>
            </a>
          ))}
        </div>
      )}
      {step.hardware?.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {step.hardware.map((hw: any, i: number) => (
            <div key={i} className="rounded-xl bg-muted border border-border overflow-hidden">
              {hw.imageUrl ? <img src={hw.imageUrl} alt={hw.name} className="w-full h-36 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                : <div className="w-full h-20 bg-muted flex items-center justify-center"><Cpu className="w-8 h-8 text-muted-foreground/50" /></div>}
              <div className="p-3">
                <p className="text-foreground text-xs font-bold">{hw.name}</p>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{hw.specs}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-primary font-head font-bold text-xs">{hw.priceRange}</span>
                  <a href={hw.buyLink} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30 transition-colors">
                    Buy <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {step.resources?.length > 0 && (
        <div className="space-y-2">
          {step.resources.map((res: any, i: number) => (
            <div key={i} className="rounded-xl bg-muted border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Database className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                  <p className="text-foreground text-xs font-bold truncate">{res.name}</p>
                  <span className="chip chip-gray text-xs flex-shrink-0">{res.type}</span>
                </div>
                <a href={res.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 flex-shrink-0 chip chip-cyan text-xs hover:opacity-80">
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-muted-foreground text-xs mt-1">{res.description}</p>
              {res.downloadCmd && <pre className="text-xs text-green-400 bg-muted px-2 py-1.5 rounded-lg mt-2 overflow-x-auto">{res.downloadCmd}</pre>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────── */
export default function GuestStream() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const location   = useLocation()

  const routeState = (location.state as any) || {}
  const [showHvBanner, setShowHvBanner] = useState<boolean>(routeState.highVolume ?? false)
  const hvMessage = routeState.highVolumeMessage || "We're experiencing high volume of requests for Dream Loops. Your invention is queued and will start automatically — no action needed."

  const [phase,         setPhase]         = useState('starting')
  const [complete,      setComplete]      = useState(false)
  const [error,         setError]         = useState('')
  const [agentStates,   setAgentStates]   = useState<Record<string, string>>({})
  const [agents,        setAgents]        = useState<Record<string, string>>({})
  const [activeAgents,  setActiveAgents]  = useState<Set<string>>(new Set())
  const [searchInfo,    setSearchInfo]    = useState<any>(null)
  const [synthesis,     setSynthesis]     = useState<any>(null)
  const [critique,      setCritique]      = useState<any>(null)
  const [mvpSpec,       setMvpSpec]       = useState<any>(null)
  const [canvasData,    setCanvasData]    = useState<any>(null)
  const [enrichedGuide, setEnrichedGuide] = useState<any>(null)
  const [gettingComps,  setGettingComps]  = useState(false)
  const [compsError,    setCompsError]    = useState<string | null>(null)
  const [pdfing,        setPdfing]        = useState(false)

  const doneCount = Object.values(agentStates).filter(s => s === 'done').length

  const buildPercent = (() => {
    if (complete) return 100
    switch (phase) {
      case 'starting':         return 5
      case 'searching':        return 15
      case 'reading':          return 30
      case 'dreaming':         return Math.round(40 + (doneCount / 10) * 25)
      case 'synthesizing':     return 70
      case 'critiquing':       return 85
      case 'generating_mvp':   return 95
      case 'generating_canvas': return 98
      default:                 return 5
    }
  })()

  const [displayPercent, setDisplayPercent] = useState(0)
  useEffect(() => {
    if (complete) { setDisplayPercent(100); return }
    setDisplayPercent(prev => Math.max(prev, buildPercent))
  }, [buildPercent, complete])

  useEffect(() => {
    if (complete) return
    const iv = setInterval(() => {
      setDisplayPercent(prev => {
        if (prev < 95 || prev >= 99) return prev
        return Math.round((prev + 0.3) * 10) / 10
      })
    }, 600)
    return () => clearInterval(iv)
  }, [complete])

  const audioStart       = useRef<HTMLAudioElement | null>(null)
  const audioAgentRefs   = useRef<Record<string, HTMLAudioElement | null>>({})
  const audioCritiqueOut = useRef<HTMLAudioElement | null>(null)
  const audioPlayed      = useRef<Set<string>>(new Set())

  const playAudio = (ref: React.RefObject<HTMLAudioElement | null>, key: string) => {
    if (!key || audioPlayed.current.has(key)) return
    audioPlayed.current.add(key)
    if (!ref?.current) return
    ref.current.currentTime = 0
    ref.current.play().catch(() => {})
  }

  const playAgentAudio = (lens: string) => {
    const key = `agent:${lens}`
    if (audioPlayed.current.has(key)) return
    audioPlayed.current.add(key)
    const el = audioAgentRefs.current[lens]
    if (!el) return
    el.currentTime = 0
    el.play().catch(() => {})
  }

  /* ── SSE stream ─────────────────────────────────────────── */
  useEffect(() => {
    if (!id) return
    playAudio(audioStart, 'stream-start')
    const es = new EventSource(`/inventor-studio/api/stream/${id}`)

    es.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data)

        if (type === 'status')          { setPhase(data.phase || 'running'); setShowHvBanner(false) }
        if (type === 'search_complete') setSearchInfo(data)
        if (type === 'agent_start') {
          const lens = data?.lens
          if (lens) {
            setAgentStates(prev => ({ ...prev, [lens]: 'active' }))
            setActiveAgents(prev => new Set([...prev, lens]))
            playAgentAudio(lens)
          }
        }
        if (type === 'agent_output') {
          const lens = data?.lens
          if (lens) {
            setAgentStates(prev => ({ ...prev, [lens]: 'done' }))
            setActiveAgents(prev => { const s = new Set(prev); s.delete(lens); return s })
            setAgents(prev => ({ ...prev, [lens]: data.output }))
          }
        }
        if (type === 'synthesis') setSynthesis(data)
        if (type === 'critique')  { setCritique(data); playAudio(audioCritiqueOut, 'critique') }
        if (type === 'complete') {
          setComplete(true)
          setPhase('complete')
          setMvpSpec(data.mvpSpec)
          setAgentStates(prev => {
            const next = { ...prev }
            Object.keys(next).forEach(k => { if (next[k] === 'active') next[k] = 'done' })
            return next
          })
        }
        if (type === 'canvas') {
          if (data.canvas) setCanvasData(data.canvas)
          es.close()
        }
        if (type === 'error') {
          setError(data?.message || 'Dream failed')
          es.close()
        }
      } catch { /* ignore */ }
    }

    es.onerror = () => es.close()
    return () => es.close()
  }, [id])

  /* ── Get Components ─────────────────────────────────────── */
  const handleGetComponents = async () => {
    setGettingComps(true)
    setCompsError(null)
    try {
      const { data } = await api.post(`/inventions/${id}/components`)
      if (data.hasRealData) {
        setEnrichedGuide(data.enrichedGuide)
      } else {
        if (data.enrichedGuide?.length) setEnrichedGuide(data.enrichedGuide)
        setCompsError('Could not identify specific components. Try again for better results.')
      }
    } catch {
      setCompsError('Failed to fetch components. Try again.')
    } finally {
      setGettingComps(false)
    }
  }

  /* ── PDF download ───────────────────────────────────────── */
  const handlePdf = async () => {
    setPdfing(true)
    try {
      await generateInventionPdf({
        invention: { title: mvpSpec?.title, domain: mvpSpec?.domain, seed_concept: id, created_at: new Date().toISOString() },
        agents,
        synthesis,
        critique,
        mvpSpec,
        seedConcept: id || '',
        enrichedGuide,
      })
    } catch (e) { console.error('PDF error', e) }
    finally { setPdfing(false) }
  }

  return (
    <div className="h-screen dream-bg flex flex-col overflow-hidden">

      <audio ref={audioStart}       src="/inventor-studio/audio/stream-start.mp3"    preload="auto" />
      {LENSES.map(lens => (
        <audio key={lens.id} src={`/inventor-studio/audio/agent-${lens.id}.mp3`} preload="auto"
          ref={el => { audioAgentRefs.current[lens.id] = el }} />
      ))}
      <audio ref={audioCritiqueOut} src="/inventor-studio/audio/critique-output.mp3" preload="auto" />

      {/* ── Header ── */}
      <div className="w-full flex items-center gap-3 px-4 py-3 md:px-5 md:py-4 border-b border-border bg-card/95 backdrop-blur-sm z-10 flex-shrink-0">
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={16} color="#fff" fill="#fff" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {!complete && !error && <span className="spinner-cyan" />}
            {complete  && <CheckCircle className="w-4 h-4 text-green-400" />}
            {error     && <XCircle className="w-4 h-4 text-red-400" />}
            <span className="font-head text-sm font-bold text-foreground">
              {error ? 'Dream Failed' : complete ? 'Dream Complete' : 'ASI Dreaming'}
            </span>
          </div>
          <p className="text-muted-foreground text-xs mt-0.5 shimmer-text">
            {error ? error : (PHASE_LABELS[phase] || 'Running...')}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-shrink-0">
          {complete && mvpSpec && (
            <button onClick={handlePdf} disabled={pdfing}
              className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5">
              {pdfing ? <span className="spinner" /> : <FileText className="w-3.5 h-3.5" />}
              PDF
            </button>
          )}
          <button onClick={() => navigate('/signup')} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
            Sign Up <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── High-volume banner ── */}
      {showHvBanner && (
        <div className="flex-shrink-0 mx-5 mt-3" style={{
          background: 'rgba(251,146,60,0.08)',
          border: '1px solid rgba(251,146,60,0.35)',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertTriangle size={16} color="#fb923c" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: '#fbd38d', fontFamily: 'Poppins, sans-serif', lineHeight: 1.55, flex: 1 }}>
            {hvMessage}
          </span>
          <button onClick={() => setShowHvBanner(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            <X size={14} color="#fb923c" />
          </button>
        </div>
      )}

      {/* ── Body: canvas | panel ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ── Canvas ── */}
        <div className="h-52 md:h-auto md:flex-[2.8] relative border-b md:border-b-0 md:border-r border-border bg-background">
          {complete && (canvasData || mvpSpec?.prototypeCanvas)?.nodes?.length > 0 ? (
            <>
              <div style={{
                position: 'absolute', top: 12, left: 12, zIndex: 20,
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(8,8,14,0.85)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '6px 12px',
              }}>
                <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Prototype Layout
                </span>
                <span className="chip chip-gold" style={{ fontSize: '10px', marginLeft: 4 }}>
                  {(canvasData || mvpSpec?.prototypeCanvas).nodes.length} components
                </span>
              </div>
              <PrototypeCanvas
                canvasData={canvasData || mvpSpec?.prototypeCanvas}
                title={mvpSpec.title}
                style={{ height: '100%', borderRadius: 0, border: 'none' }}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  border: '3px solid rgba(6,182,212,0.15)',
                  borderTop: '3px solid #06b6d4',
                  animation: 'spin 1s linear infinite',
                }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    fontFamily: 'Kanit, sans-serif', fontWeight: 700,
                    fontSize: 15, color: '#06b6d4',
                  }}>
                    {displayPercent % 1 === 0 ? displayPercent : displayPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-cyan-400 font-head text-sm font-bold mb-1">Building Prototype</p>
                <p className="text-muted-foreground text-xs shimmer-text">{PHASE_LABELS[phase] || 'Running...'}</p>
              </div>
              <div className="flex gap-2 mt-2">
                {['searching', 'dreaming', 'synthesizing', 'critiquing', 'generating_mvp', 'generating_canvas'].map(p => (
                  <div key={p} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: phase === p ? '#06b6d4' : 'var(--border)',
                    boxShadow: phase === p ? '0 0 8px #06b6d4' : 'none',
                    transition: 'all 0.3s',
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Sources Found */}
            <div className="glass-card-accent p-3">
              <p className="text-cyan-400 font-head text-xs font-bold uppercase tracking-wider mb-2">Sources Found</p>
              {searchInfo ? (
                <div className="flex flex-wrap gap-1.5 animate-fadeIn">
                  {[
                    { label: 'Web',     count: searchInfo.webCount     },
                    { label: 'ArXiv',   count: searchInfo.arxivCount   },
                    { label: 'PubMed',  count: searchInfo.pubmedCount  },
                    { label: 'Patents', count: searchInfo.patentCount  },
                    { label: 'GitHub',  count: searchInfo.githubCount  },
                  ].filter(s => s.count > 0).map(s => (
                    <span key={s.label} className="chip chip-cyan text-xs">{s.count} {s.label}</span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground/50 text-xs">searching knowledge sources...</p>
              )}
            </div>

            {/* Dream Agents */}
            <div>
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <Brain className="w-3 h-3" /> Dream Agents
                <span className="chip chip-gold ml-auto text-xs">{Object.keys(agents).length}/{LENSES.length}</span>
              </p>
              <div className="space-y-1.5">
                {LENSES.map(lens => (
                  <AgentCard key={lens.id} lens={lens} output={agents[lens.id]} isActive={activeAgents.has(lens.id)} />
                ))}
              </div>
            </div>

            {/* Critique */}
            <div className={`p-3 rounded-xl border transition-colors ${
              critique
                ? critique.verdict === 'survives' ? 'bg-green-500/5 border-green-500/20'
                : critique.verdict === 'killed'   ? 'bg-red-500/5 border-red-500/20'
                :                                   'bg-yellow-500/5 border-yellow-500/20'
                : 'bg-card border-border'
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                {critique
                  ? critique.verdict === 'killed'
                    ? <XCircle className="w-3.5 h-3.5 text-red-400" />
                    : <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  : <span className={`w-2 h-2 rounded-full flex-shrink-0 ${phase === 'critiquing' ? 'dream-pulse bg-primary' : 'bg-gray-700'}`} />
                }
                <p className={`font-head text-xs font-bold uppercase tracking-wider ${
                  critique
                    ? critique.verdict === 'killed' ? 'text-red-400' : critique.verdict === 'survives' ? 'text-green-400' : 'text-yellow-400'
                    : 'text-muted-foreground'
                }`}>
                  {critique ? `Critic: ${critique.verdict}` : 'Critic Agent'}
                </p>
                {critique && (
                  <span className="ml-auto text-xs text-muted-foreground">Novelty {Math.round((critique.finalNoveltyScore || 0) * 100)}%</span>
                )}
                {phase === 'critiquing' && !critique && <span className="spinner-cyan ml-auto" />}
              </div>
              {critique
                ? <p className="text-muted-foreground text-xs leading-relaxed animate-fadeIn">{critique.reason?.slice(0, 200)}</p>
                : <p className="text-muted-foreground/50 text-xs">waiting for critic...</p>
              }
            </div>

            {/* Synthesis */}
            <div className="glass-card-gold p-3">
              <p className="text-primary font-head text-xs font-bold uppercase tracking-wider mb-2">Synthesis</p>
              {synthesis ? (
                <div className="animate-fadeIn">
                  {synthesis.emergentInsight && (
                    <p className="text-muted-foreground text-xs leading-relaxed mb-3 italic">"{synthesis.emergentInsight}"</p>
                  )}
                  {synthesis.topInventions?.slice(0, 2).map((inv: any, i: number) => (
                    <div key={i} className="mb-2 last:mb-0 p-2.5 rounded-xl bg-muted">
                      <p className="text-foreground font-head text-xs font-bold mb-1">{inv.title}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed">{inv.concept?.slice(0, 150)}...</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {inv.sourceLenses?.map((l: string) => <span key={l} className={`text-xs font-head font-bold ${LENS_COLORS[l] || 'text-muted-foreground'}`}>#{l}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground/50 text-xs">synthesizing discoveries...</p>
              )}
            </div>

            {/* MVP Specification */}
            <div className="glass-card-gold p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-primary font-head text-xs font-bold uppercase tracking-wider mb-1">MVP Specification</p>
                  <h2 className="font-head text-base font-bold text-foreground">{mvpSpec?.title || <span className="text-muted-foreground/50">generating...</span>}</h2>
                </div>
                {mvpSpec?.domain && <span className="chip chip-gold flex-shrink-0 text-xs">{mvpSpec.domain}</span>}
              </div>
              {mvpSpec ? (
                <div className="animate-fadeIn">
                  <p className="text-muted-foreground text-xs leading-relaxed mb-3">{mvpSpec.oneLiner}</p>
                  <div className="space-y-2">
                    <ScoreBar label="Novelty"     value={mvpSpec.noveltyScore}     colorClass="gold"  />
                    <ScoreBar label="Feasibility" value={mvpSpec.feasibilityScore} colorClass="cyan"  />
                    <ScoreBar label="Impact"      value={mvpSpec.impactScore}      colorClass="green" />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground/50 text-xs">waiting for dream to complete...</p>
              )}
            </div>

            {/* Problem Solved */}
            <div className="glass-card p-3">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-1.5">Problem Solved</p>
              {mvpSpec?.problemSolved
                ? <p className="text-muted-foreground text-xs leading-relaxed animate-fadeIn">{mvpSpec.problemSolved}</p>
                : <p className="text-muted-foreground/50 text-xs">pending...</p>
              }
            </div>

            {/* Components */}
            <div className="glass-card p-3">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">Components</p>
              {mvpSpec?.components?.length > 0 ? (
                <ul className="space-y-1.5 animate-fadeIn">
                  {mvpSpec.components.map((c: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-primary font-bold flex-shrink-0 font-head">{i + 1}.</span> {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground/50 text-xs">pending...</p>
              )}
            </div>

            {/* Prototype Steps */}
            <div className="glass-card p-3">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">Prototype Steps</p>
              {mvpSpec?.prototypeSteps?.length > 0 ? (
                <ol className="space-y-2 animate-fadeIn">
                  {mvpSpec.prototypeSteps.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold font-head flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-muted-foreground text-xs leading-relaxed">{s}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground/50 text-xs">pending...</p>
              )}
            </div>

            {/* How to Build */}
            <div className="glass-card p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider">How to Build</p>
                {mvpSpec?.buildGuide?.length > 0 && complete && (
                  <button onClick={handleGetComponents} disabled={gettingComps}
                    className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1">
                    {gettingComps ? <><span className="spinner" /> Fetching...</> : <><Sparkles className="w-3 h-3" /> Get Components</>}
                  </button>
                )}
              </div>
              {compsError && (
                <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed">{compsError}</div>
              )}
              {mvpSpec?.buildGuide?.length > 0 ? (
                <div className="space-y-4 animate-fadeIn">
                  {mvpSpec.buildGuide.map((ph: any, pi: number) => {
                    const enrichedPhase = enrichedGuide?.[pi]
                    return (
                      <div key={pi}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-foreground font-head text-xs font-bold">{ph.phase}</p>
                          {ph.duration && <span className="chip chip-gray text-xs">{ph.duration}</span>}
                        </div>
                        <ol className="space-y-3 pl-1">
                          {ph.steps?.map((step: string, si: number) => {
                            const enriched = enrichedPhase?.enrichedSteps?.[si]
                            return (
                              <li key={si}>
                                <div className="flex items-start gap-2">
                                  <span className="w-4 h-4 rounded-full bg-cyan-500/15 text-cyan-400 text-xs font-bold font-head flex items-center justify-center flex-shrink-0 mt-0.5">{si + 1}</span>
                                  <p className="text-muted-foreground text-xs leading-relaxed">{step}</p>
                                </div>
                                {enriched && <EnrichedStepView step={enriched} />}
                              </li>
                            )
                          })}
                        </ol>
                        {pi < mvpSpec.buildGuide.length - 1 && <div className="mt-3 border-b border-border" />}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground/50 text-xs">pending...</p>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="glass-card p-3">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">Cost Breakdown</p>
              {mvpSpec?.costBreakdown?.items?.length > 0 ? (
                <div className="animate-fadeIn">
                  <div className="space-y-1.5 mb-2">
                    {mvpSpec.costBreakdown.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-start justify-between gap-2 py-1.5 border-b border-border last:border-0">
                        <div className="min-w-0">
                          <p className="text-foreground text-xs font-semibold">{item.name}</p>
                          {item.notes && <p className="text-muted-foreground text-xs mt-0.5">{item.notes}</p>}
                        </div>
                        <span className="text-primary font-head font-bold text-xs flex-shrink-0">{item.cost}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-border">
                    <p className="text-foreground font-head text-xs font-bold">Total Estimate</p>
                    <p className="text-primary font-head font-bold text-xs">{mvpSpec.costBreakdown.totalEstimate}</p>
                  </div>
                  {mvpSpec.costBreakdown.notes && (
                    <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">{mvpSpec.costBreakdown.notes}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground/50 text-xs">pending...</p>
              )}
            </div>

            {/* Code Scaffold */}
            <div className="glass-card p-3">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">Code Scaffold</p>
              {mvpSpec?.codeScaffold
                ? <pre className="text-xs text-green-400 overflow-x-auto leading-relaxed bg-muted p-2.5 rounded-xl animate-fadeIn">{mvpSpec.codeScaffold}</pre>
                : <p className="text-muted-foreground/50 text-xs">pending...</p>
              }
            </div>

            {/* Next Experiments */}
            <div className="glass-card p-3">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">Next Experiments</p>
              {mvpSpec?.nextExperiments?.length > 0 ? (
                <ul className="space-y-1.5 animate-fadeIn">
                  {mvpSpec.nextExperiments.map((e: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Zap className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" /> {e}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground/50 text-xs">pending...</p>
              )}
            </div>

            {/* Cost + Time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="glass-card p-3">
                <p className="text-muted-foreground text-xs mb-1">Prototype Cost</p>
                <p className="text-foreground font-head font-bold text-xs">{mvpSpec?.costBreakdown?.totalEstimate || mvpSpec?.estimatedPrototypeCost || '—'}</p>
              </div>
              <div className="glass-card p-3">
                <p className="text-muted-foreground text-xs mb-1">Time to Build</p>
                <p className="text-foreground font-head font-bold text-xs">{mvpSpec?.timeToPrototype || '—'}</p>
              </div>
            </div>

            {/* CTA */}
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 16, padding: 20, textAlign: 'center' }}>
              <h3 style={{ fontFamily: 'Kanit, sans-serif', fontSize: 15, color: 'var(--foreground)', marginBottom: 6 }}>
                Want to save & invent more?
              </h3>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 11, lineHeight: 1.6, marginBottom: 14 }}>
                Create a free account to save this invention, get <strong style={{ color: 'var(--primary)' }}>3 more inventions</strong>, and export any time.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/signup')} className="btn-primary text-xs py-2 px-4">
                  Create Free Account <ArrowRight size={13} style={{ display: 'inline', marginLeft: 4 }} />
                </button>
                <button onClick={() => navigate('/')} className="btn-ghost text-xs">Back to Home</button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
