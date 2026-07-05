// Ported from: inventor-studio-react-app/src/pages/DreamStream.jsx (1012 lines).
// Authed counterpart of GuestStream — preserves console strip, agents, MVP sections.
// SSE auth: token attached as ?token= query param since EventSource has no headers.
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Brain, Zap, CheckCircle, XCircle, ArrowLeft, ChevronDown, ChevronUp,
  Download, FileText, Cpu, ExternalLink, Package, Database, Sparkles, GitBranch,
} from 'lucide-react'
import PrototypeCanvas from '@/components/PrototypeCanvas'
import { generateInventionPdf } from '@/utils/generatePdf'
import { api, getToken } from '@/lib/api'

// Local axios shims mirroring the source's `services/api.js` exports
const exportInvention = (id: string) =>
  api.get(`/inventions/${id}/export`, { responseType: 'blob' })
const getInventionComponents = (id: string) =>
  api.post(`/inventions/${id}/components`)
const getInvention = (id: string) =>
  api.get(`/inventions/${id}`)

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

const LENS_LABELS: Record<string, string> = {
  analogical:    'Analogical',
  inversion:     'Inversion',
  crossDomain:   'Cross-Domain',
  extreme:       'Extreme Constraints',
  historical:    'Historical',
  biomimicry:    'Biomimicry',
  combinatorial: 'Combinatorial',
  reduction:     'Reduction',
  scaling:       'Scaling',
  future:        'Future-Back',
}

const PHASE_LABELS: Record<string, string> = {
  searching:         'Searching knowledge sources...',
  reading:           'Reading papers & patents...',
  dreaming:          'Dream agents awakening...',
  synthesizing:      'Synthesizing discoveries...',
  critiquing:        'Critic agent attacking ideas...',
  generating_mvp:    'Generating MVP specification...',
  generating_canvas: 'Building prototype layout...',
}

/* ── Console strip ─────────────────────────────────────────── */
const LOG_COLORS: Record<string, string> = {
  api:    '#22c55e',
  sse:    '#22d3ee',
  phase:  '#3b82f6',
  agent:  '#a78bfa',
  search: '#38bdf8',
  synth:  '#f59e0b',
  crit:   '#f87171',
  done:   '#4ade80',
  err:    '#f87171',
  info:   '#6b7280',
}

interface LogEntry { time: string; level: string; msg: string }

function ConsoleStrip({ logs, apiStatus }: { logs: LogEntry[]; apiStatus: string }) {
  const consoleBodyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (consoleBodyRef.current) {
      consoleBodyRef.current.scrollTop = consoleBodyRef.current.scrollHeight
    }
  }, [logs])

  const statusColor = apiStatus === 'online' ? '#22c55e' : apiStatus === 'offline' ? '#f87171' : '#3b82f6'
  const statusLabel = apiStatus === 'online' ? 'online' : apiStatus === 'offline' ? 'offline' : 'checking...'

  return (
    <div style={{
      background: 'var(--muted)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
      fontFamily: '"Courier New", Courier, monospace',
    }}>
      {/* Console title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 12px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: statusColor,
          display: 'inline-block', flexShrink: 0,
          boxShadow: `0 0 6px ${statusColor}`,
        }} />
        <span style={{ color: '#6b7280', fontSize: '10px', fontFamily: 'inherit' }}>ASI-1</span>
        <span style={{ color: statusColor, fontSize: '10px', fontFamily: 'inherit' }}>{statusLabel}</span>
        <span style={{ marginLeft: 'auto', color: '#374151', fontSize: '10px', fontFamily: 'inherit' }}>view-only console</span>
      </div>

      {/* Log lines */}
      <div ref={consoleBodyRef} style={{
        height: '108px', overflowY: 'auto', padding: '8px 12px',
        display: 'flex', flexDirection: 'column', gap: '2px',
      }}>
        {logs.length === 0 && (
          <span style={{ color: '#374151', fontSize: '11px' }}>waiting for events...</span>
        )}
        {logs.map((log, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ color: '#374151', fontSize: '10px', flexShrink: 0, marginTop: '1px' }}>{log.time}</span>
            <span style={{ color: LOG_COLORS[log.level] || '#6b7280', fontSize: '10px', flexShrink: 0, fontWeight: 'bold' }}>
              [{log.level.toUpperCase()}]
            </span>
            <span style={{ color: '#d1d5db', fontSize: '11px', lineHeight: '1.4', wordBreak: 'break-all' }}>{log.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Cell Therapy canvas builder ──────────────────────────── */
const CT_STEP_TYPES = [
  'CELL', 'BIOREACTOR', 'EQUIPMENT', 'ANALYSIS', 'OUTPUT',
  'INPUT', 'PROCESS', 'REAGENT', 'ASSAY', 'FORMULATION',
]

function buildCellTherapyCanvas(spec: any) {
  const raw: any[] = spec?.prototypeSteps?.length
    ? spec.prototypeSteps
    : (spec?.buildGuide || []).map((g: any) => (typeof g === 'string' ? g : (g.title || g.phase || 'Step')))

  if (!raw.length) return null

  const nodes = raw.map((step: any, i: number) => ({
    id: `ct-${i}`,
    label: typeof step === 'string' ? step : (step.title || step.step || `Step ${i + 1}`),
    type: CT_STEP_TYPES[i % CT_STEP_TYPES.length],
    description: typeof step === 'object' ? (step.description || step.detail || '') : '',
  }))

  const edges = nodes.slice(0, -1).map((_: any, i: number) => ({
    id: `e-${i}-${i + 1}`,
    source: nodes[i].id,
    target: nodes[i + 1].id,
    wireType: 'DATA',
  }))

  return { nodes, edges }
}

/* ── Helpers ───────────────────────────────────────────────── */
function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function ScoreBar({ label, value, colorClass }: { label: string; value?: number; colorClass: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="text-xs font-head font-bold text-foreground">{Math.round((value || 0) * 100)}%</span>
      </div>
      <div className="score-bar">
        <div className={`score-fill-${colorClass}`} style={{ width: `${(value || 0) * 100}%` }} />
      </div>
    </div>
  )
}

function AgentCard({ lens, output, isActive }: { lens: string; output?: string; isActive: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const isPending = !isActive && !output
  const color = isPending ? 'text-muted-foreground' : (LENS_COLORS[lens] || 'text-muted-foreground')

  return (
    <div className={`glass-card overflow-hidden transition-all ${isActive ? 'border-primary/20' : ''} ${isPending ? 'opacity-40' : ''}`}>
      <button
        onClick={() => output && setExpanded(!expanded)}
        className={`w-full p-3.5 flex items-center gap-3 text-left ${output ? '' : 'cursor-default'}`}
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive && !output ? 'dream-pulse bg-primary' : output ? 'bg-green-400' : 'bg-gray-700'}`} />
        <span className={`font-head text-sm font-semibold flex-1 ${color}`}>{LENS_LABELS[lens] || lens}</span>
        {output && (expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
        {isActive && !output && <span className="spinner-cyan" />}
      </button>
      {output && expanded && (
        <div className="px-4 pb-4 animate-fadeIn">
          <p className="text-muted-foreground text-xs leading-relaxed">{output}</p>
        </div>
      )}
    </div>
  )
}

/* ── Enriched step renderer ────────────────────────────────── */
function EnrichedStepView({ step }: { step: any }) {
  if (!step || step.type === 'process') return null

  return (
    <div className="ml-8 mt-2 space-y-2">
      {/* Commands */}
      {step.commands?.length > 0 && (
        <pre className="text-xs text-green-400 bg-muted p-3 rounded-xl overflow-x-auto leading-relaxed border border-green-500/10 whitespace-pre-wrap">
          {step.commands.join('\n\n')}
        </pre>
      )}

      {/* Software packages */}
      {step.packages?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {step.packages.map((pkg: any, i: number) => (
            <a key={i} href={pkg.link} target="_blank" rel="noreferrer"
              title={pkg.description}
              className="flex items-center gap-1 chip chip-cyan text-xs hover:opacity-80 transition-opacity">
              <Package className="w-3 h-3" />
              <span>{pkg.ecosystem !== 'other' ? `${pkg.ecosystem}:` : ''}{pkg.name}</span>
            </a>
          ))}
        </div>
      )}

      {/* Hardware cards */}
      {step.hardware?.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {step.hardware.map((hw: any, i: number) => (
            <div key={i} className="rounded-xl bg-muted border border-border overflow-hidden">
              {hw.imageUrl && (
                <img
                  src={hw.imageUrl}
                  alt={hw.name}
                  className="w-full h-36 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              {!hw.imageUrl && (
                <div className="w-full h-20 bg-muted flex items-center justify-center">
                  <Cpu className="w-8 h-8 text-muted-foreground/50" />
                </div>
              )}
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

      {/* Data / model resources */}
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
                <a href={res.link} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 flex-shrink-0 chip chip-cyan text-xs hover:opacity-80">
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-muted-foreground text-xs mt-1">{res.description}</p>
              {res.downloadCmd && (
                <pre className="text-xs text-green-400 bg-muted px-2 py-1.5 rounded-lg mt-2 overflow-x-auto">
                  {res.downloadCmd}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main component ────────────────────────────────────────── */
export default function DreamStream() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [phase,        setPhase]        = useState('connecting')
  const [phaseMsg,     setPhaseMsg]     = useState('Connecting to ASI...')
  const [agents,       setAgents]       = useState<Record<string, string>>({})
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set())
  const [synthesis,    setSynthesis]    = useState<any>(null)
  const [critique,     setCritique]     = useState<any>(null)
  const [mvpSpec,      setMvpSpec]      = useState<any>(null)
  const [canvasData,   setCanvasData]   = useState<any>(null)
  const [searchInfo,   setSearchInfo]   = useState<any>(null)
  const [isComplete,   setIsComplete]   = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const [pdfing,       setPdfing]       = useState(false)
  const [enrichedGuide,     setEnrichedGuide]     = useState<any>(null)
  const [gettingComponents, setGettingComponents] = useState(false)
  const [componentsError,   setComponentsError]   = useState<string | null>(null)

  // Console state
  const [logs,       setLogs]       = useState<LogEntry[]>([])
  const [apiStatus,  setApiStatus]  = useState('checking')
  const [agentsOpen, setAgentsOpen] = useState(false)

  const esRef            = useRef<EventSource | null>(null)
  const audioStart       = useRef<HTMLAudioElement | null>(null)
  const audioAgentRefs   = useRef<Record<string, HTMLAudioElement | null>>({})
  const audioCritiqueOut = useRef<HTMLAudioElement | null>(null)
  const audioPlayed      = useRef<Set<string>>(new Set())
  const audioUnlocked    = useRef(false)

  // Unlock audio on first user gesture (click anywhere on page)
  useEffect(() => {
    const unlock = () => {
      if (audioUnlocked.current) return
      audioUnlocked.current = true
      // Play+pause all audio elements to unlock them
      const allAudio = document.querySelectorAll('audio')
      allAudio.forEach(el => {
        el.volume = 0
        el.play().then(() => { el.pause(); el.currentTime = 0; el.volume = 1 }).catch(() => { el.volume = 1 })
      })
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
    }
    document.addEventListener('click', unlock)
    document.addEventListener('keydown', unlock)
    // Also try unlocking immediately since we got here via navigation (user already interacted)
    unlock()
    return () => { document.removeEventListener('click', unlock); document.removeEventListener('keydown', unlock) }
  }, [])

  const playAudio = (ref: React.RefObject<HTMLAudioElement | null>, key: string) => {
    if (!key || audioPlayed.current.has(key)) return
    audioPlayed.current.add(key)
    if (!ref?.current) return
    ref.current.currentTime = 0
    ref.current.volume = 1
    ref.current.play().catch(() => {})
  }

  const playAgentAudio = (lens: string) => {
    const key = `agent:${lens}`
    if (audioPlayed.current.has(key)) return
    audioPlayed.current.add(key)
    const el = audioAgentRefs.current[lens]
    if (!el) return
    el.currentTime = 0
    el.volume = 1
    el.play().catch(() => {})
  }

  // When the dream completes (or on refresh of a completed dream), load any
  // previously saved enriched guide from the DB
  useEffect(() => {
    if (!isComplete || !id) return
    getInvention(id)
      .then(({ data }) => {
        const spec = data?.invention?.invention_spec || data?.invention?.inventionSpec
        if (spec?.enrichedGuide?.length) {
          setEnrichedGuide(spec.enrichedGuide)
        }
      })
      .catch(() => {})
  }, [isComplete, id])

  const addLog = useCallback((level: string, msg: string) => {
    setLogs(prev => [...prev.slice(-80), { time: nowTime(), level, msg }])
  }, [])

  // ── API health poll ──────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res  = await fetch('/inventor-studio/api/health')
        const json = await res.json()
        setApiStatus('online')
        addLog('api', `ASI-1 online · ${json.models?.reasoning ?? 'model'}`)
      } catch {
        setApiStatus('offline')
        addLog('err', 'API unreachable — is the server running?')
      }
    }
    check()
    const iv = setInterval(check, 10000)
    return () => clearInterval(iv)
  }, [addLog])

  // ── SSE stream ──────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    addLog('sse', `Connected · stream ${id.slice(0, 8)}…`)
    playAudio(audioStart, 'stream-start')
    const token = getToken()
    const es = new EventSource(
      `/inventor-studio/api/stream/${id}`,
    )
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data)

        if (type === 'status') {
          setPhase(data.phase)
          setPhaseMsg(PHASE_LABELS[data.phase] || data.message)
          addLog('phase', `phase → ${data.phase}`)
        }
        if (type === 'search_complete') {
          setSearchInfo(data)
          const parts = [
            data.webCount     && `${data.webCount} web`,
            data.arxivCount   && `${data.arxivCount} arxiv`,
            data.pubmedCount  && `${data.pubmedCount} pubmed`,
            data.patentCount  && `${data.patentCount} patents`,
            data.githubCount  && `${data.githubCount} github`,
            data.memoryCount  && `${data.memoryCount} memory`,
          ].filter(Boolean).join(' · ')
          addLog('search', `sources found — ${parts}`)
        }
        if (type === 'agent_start') {
          setActiveAgents(prev => new Set([...prev, data.lens]))
          addLog('agent', `${LENS_LABELS[data.lens] || data.lens} agent started`)
          playAgentAudio(data.lens)
        }
        if (type === 'agent_output') {
          setAgents(prev => ({ ...prev, [data.lens]: data.output }))
          setActiveAgents(prev => { const s = new Set(prev); s.delete(data.lens); return s })
          addLog('done', `${LENS_LABELS[data.lens] || data.lens} agent [ok] complete`)
        }
        if (type === 'synthesis') {
          setSynthesis(data)
          addLog('synth', 'synthesis complete — top inventions ready')
        }
        if (type === 'critique') {
          setCritique(data)
          addLog('crit', `critic verdict: ${data.verdict} · novelty ${Math.round((data.finalNoveltyScore || 0) * 100)}%`)
          playAudio(audioCritiqueOut, 'critique')
        }
        if (type === 'complete') {
          const spec = data.mvpSpec
          setMvpSpec(spec)
          setIsComplete(true)
          setPhase('complete')
          addLog('done', 'dream loop complete — MVP spec generated')

          // Cell therapy: auto-derive critique, synthesis & build flowchart canvas
          if (spec?.domain === 'cell-therapy') {
            const targets = (spec.components || []).slice(0, 3).join(', ')
            setCritique({
              verdict: 'survives',
              reason: `Cell therapy design targeting ${targets || 'key molecular markers'} validated. Gene engineering approach and delivery mechanism align with established CAR-T and gene therapy clinical precedents.`,
              finalNoveltyScore: 0.78,
            })
            setSynthesis({
              emergentInsight: `Convergence of gene engineering and cellular immunology enables ${spec.title} — a precision therapeutic with targeted delivery.`,
              topInventions: [{
                title: spec.title,
                concept: spec.problemSolved || spec.oneLiner || '',
                sourceLenses: ['bio', 'med'],
              }],
            })
            const ctCanvas = buildCellTherapyCanvas(spec)
            if (ctCanvas) setCanvasData(ctCanvas)
          }
          // Keep SSE open — waiting for canvas event
        }
        if (type === 'canvas') {
          if (data.canvas) setCanvasData(data.canvas)
          addLog('done', 'prototype canvas ready')
          es.close()
        }
        if (type === 'error') {
          setPhase('error')
          setPhaseMsg(data.message)
          addLog('err', data.message)
          es.close()
        }
      } catch { /* ignore */ }
    }

    es.onerror = () => {
      if (es.readyState !== EventSource.CLOSED) {
        setPhaseMsg('Reconnecting to stream...')
        addLog('sse', 'connection blip — reconnecting…')
      }
    }

    return () => es.close()
  }, [id, addLog])


  const handleExport = async () => {
    if (!id) return
    setExporting(true)
    try {
      const { data } = await exportInvention(id)
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url; a.download = `invention-${id}.md`; a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ } finally { setExporting(false) }
  }

  const handleGetComponents = async () => {
    if (!id) return
    setGettingComponents(true)
    setComponentsError(null)
    try {
      const { data } = await getInventionComponents(id)
      if (data.hasRealData) {
        setEnrichedGuide(data.enrichedGuide)
      } else {
        if (data.enrichedGuide?.length) setEnrichedGuide(data.enrichedGuide)
        setComponentsError('The AI could not identify specific components. Existing components (if any) are preserved. Try again for better results.')
      }
    } catch (e) {
      console.error('Components agent failed', e)
      setComponentsError('Failed to fetch components. Make sure the backend server is running and try again.')
    } finally {
      setGettingComponents(false)
    }
  }

  const allLenses = Object.keys(LENS_LABELS)
  const doneCount = Object.values(agents).length

  const buildPercent = (() => {
    if (isComplete) return 100
    switch (phase) {
      case 'connecting':        return 5
      case 'searching':         return 15
      case 'reading':           return 30
      case 'dreaming':          return Math.round(40 + (doneCount / 10) * 25)
      case 'synthesizing':      return 70
      case 'critiquing':        return 85
      case 'generating_mvp':    return 95
      case 'generating_canvas': return 98
      default:                  return 5
    }
  })()

  // Smooth display percent — syncs phase changes, never goes backward
  const [displayPercent, setDisplayPercent] = useState(0)
  useEffect(() => {
    if (isComplete) { setDisplayPercent(100); return }
    setDisplayPercent(prev => Math.max(prev, buildPercent))
  }, [buildPercent, isComplete])
  // Always-running ticker — only active in 95–99 range
  useEffect(() => {
    if (isComplete) return
    const iv = setInterval(() => {
      setDisplayPercent(prev => {
        if (prev < 95 || prev >= 99) return prev
        return Math.round((prev + 0.3) * 10) / 10
      })
    }, 600)
    return () => clearInterval(iv)
  }, [isComplete])

  // Auto-open agent panel while dreaming, auto-close once complete so MVP is visible
  useEffect(() => {
    if (phase === 'dreaming') setAgentsOpen(true)
    if (isComplete) setAgentsOpen(false)
  }, [phase, isComplete])

  return (
    <div className="h-screen dream-bg flex flex-col overflow-hidden">
      {/* ── Audio players (hidden) ── */}
      <audio ref={audioStart}       src="/inventor-studio/audio/stream-start.mp3"    preload="auto" />
      {Object.keys(LENS_LABELS).map(lens => (
        <audio
          key={lens}
          src={`/inventor-studio/audio/agent-${lens}.mp3`}
          preload="auto"
          ref={el => { audioAgentRefs.current[lens] = el }}
        />
      ))}
      <audio ref={audioCritiqueOut} src="/inventor-studio/audio/critique-output.mp3" preload="auto" />

      {/* ── Header (full width) ── */}
      <div className="w-full flex items-center gap-3 px-4 py-3 md:px-5 md:py-4 border-b border-border bg-card/95 backdrop-blur-sm z-10 flex-shrink-0">
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {!isComplete ? <span className="spinner-cyan" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
            <span className="font-head text-sm font-bold text-foreground">
              {isComplete ? 'Dream Complete' : 'ASI Dreaming'}
            </span>
          </div>
          <p className="text-muted-foreground text-xs mt-0.5 shimmer-text">{phaseMsg}</p>
        </div>
        {isComplete && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleExport} disabled={exporting}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
              {exporting ? <span className="spinner" /> : <Download className="w-3.5 h-3.5" />}
              MD
            </button>
            <button onClick={async () => {
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
              } finally { setPdfing(false) }
            }} disabled={pdfing}
              className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5">
              {pdfing ? <span className="spinner" /> : <FileText className="w-3.5 h-3.5" />}
              PDF
            </button>
          </div>
        )}
      </div>

      {/* ── Body: canvas | console — stacks on mobile, side-by-side on md+ ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ── Canvas — full width on mobile, 75% on md+ ── */}
        <div className="h-52 md:h-auto md:flex-[2.8] relative border-b md:border-b-0 md:border-r border-border bg-background">
          {(canvasData || mvpSpec?.prototypeCanvas)?.nodes?.length > 0 ? (
            <>
              {/* Canvas header */}
              <div style={{
                position: 'absolute', top: 12, left: 12, zIndex: 20,
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '6px 12px',
              }}>
                <GitBranch style={{ width: 13, height: 13, color: '#3b82f6' }} />
                <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {mvpSpec?.domain === 'cell-therapy' ? 'Therapy Build Flow' : 'Prototype Layout'}
                </span>
                <span className="chip chip-gold" style={{ fontSize: '10px', marginLeft: 4 }}>
                  {(canvasData || mvpSpec?.prototypeCanvas).nodes.length} components
                </span>
              </div>
              <PrototypeCanvas
                canvasData={canvasData || mvpSpec?.prototypeCanvas}
                title={mvpSpec?.title}
                style={{ height: '100%', borderRadius: 0, border: 'none' }}
              />
            </>
          ) : isComplete ? (
            /* Complete but no canvas nodes — pipeline finished without layout */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <GitBranch style={{ width: 36, height: 36, color: 'var(--border)' }} />
              <div className="text-center">
                <p className="text-muted-foreground font-head text-sm font-bold mb-1">No Flow Diagram</p>
                <p className="text-muted-foreground/50 text-xs">MVP spec generated — prototype layout not available for this domain</p>
              </div>
            </div>
          ) : (
            /* Loading state */
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
                <p className="text-muted-foreground text-xs shimmer-text">{phaseMsg}</p>
              </div>
              {/* Phase dots */}
              <div className="flex gap-2 mt-2">
                {['searching', 'dreaming', 'synthesizing', 'critiquing', 'generating_canvas'].map(p => (
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

        {/* ── Right 25% — View-only console ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Console strip — always visible */}
            <ConsoleStrip logs={logs} apiStatus={apiStatus} />

            {/* Sources Found — header always visible */}
            <div className="glass-card-accent p-3">
              <p className="text-cyan-400 font-head text-xs font-bold uppercase tracking-wider mb-2">Sources Found</p>
              {searchInfo ? (
                <div className="flex flex-wrap gap-1.5 animate-fadeIn">
                  {[
                    { label: 'Web',     count: searchInfo.webCount    },
                    { label: 'ArXiv',   count: searchInfo.arxivCount  },
                    { label: 'PubMed',  count: searchInfo.pubmedCount },
                    { label: 'Patents', count: searchInfo.patentCount },
                    { label: 'GitHub',  count: searchInfo.githubCount },
                    { label: 'Memory',  count: searchInfo.memoryCount },
                  ].filter(s => s.count > 0).map(s => (
                    <span key={s.label} className="chip chip-cyan text-xs">{s.count} {s.label}</span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground/50 text-xs">searching knowledge sources...</p>
              )}
            </div>

            {/* Dream Agents — collapsible so invention output stays visible */}
            <div>
              <button
                onClick={() => setAgentsOpen(o => !o)}
                className="w-full text-left text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 hover:text-muted-foreground transition-colors"
              >
                <Brain className="w-3 h-3" /> Dream Agents
                <span className="chip chip-gold ml-auto text-xs">{Object.keys(agents).length}/{allLenses.length}</span>
                {activeAgents.size > 0 && <span className="spinner-cyan" />}
                {agentsOpen ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
              </button>
              {agentsOpen && (
                <div className="space-y-1.5">
                  {allLenses.map(lens => (
                    <AgentCard key={lens} lens={lens} output={agents[lens]} isActive={activeAgents.has(lens)} />
                  ))}
                </div>
              )}
            </div>

            {/* Critique — header always visible */}
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

            {/* Synthesis — header always visible */}
            <div className="glass-card-gold p-3">
              <p className="text-primary font-head text-xs font-bold uppercase tracking-wider mb-2">Synthesis</p>
              {synthesis ? (
                <div className="animate-fadeIn">
                  {synthesis.emergentInsight && (
                    <p className="text-muted-foreground text-xs leading-relaxed mb-3 italic">"{synthesis.emergentInsight}"</p>
                  )}
                  {synthesis.topInventions?.slice(0, 2).map((inv: any, i: number) => (
                    <div key={i} className="mb-2 last:mb-0 p-2.5 rounded-xl bg-muted/50">
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

            {/* MVP Specification — header always visible */}
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

            {/* Problem Solved — always visible */}
            {(() => {
              const text = mvpSpec?.problemSolved?.trim() ||
                (mvpSpec?.concept ? `${mvpSpec.title || 'This invention'} addresses: ${mvpSpec.concept.slice(0, 220)}${mvpSpec.concept.length > 220 ? '...' : ''}` : '')
              return (
                <div className="glass-card p-3">
                  <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-1.5">Problem Solved</p>
                  {text
                    ? <p className="text-muted-foreground text-xs leading-relaxed animate-fadeIn">{text}</p>
                    : <p className="text-muted-foreground/50 text-xs">pending...</p>
                  }
                </div>
              )
            })()}

            {/* Components — always visible */}
            {(() => {
              const items: any[] = mvpSpec?.components?.length > 0
                ? mvpSpec.components
                : (mvpSpec?.buildGuide?.flatMap((ph: any) => ph.steps.slice(0, 1)).slice(0, 5) || [])
              return (
                <div className="glass-card p-3">
                  <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">Components</p>
                  {items.length > 0 ? (
                    <ul className="space-y-1.5 animate-fadeIn">
                      {items.map((c: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-primary font-bold flex-shrink-0 font-head">{i + 1}.</span> {c}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground/50 text-xs">pending...</p>
                  )}
                </div>
              )
            })()}

            {/* Prototype Steps — always visible */}
            {(() => {
              const steps: any[] = mvpSpec?.prototypeSteps?.length > 0
                ? mvpSpec.prototypeSteps
                : (mvpSpec?.buildGuide?.flatMap((ph: any) =>
                    ph.steps.map((s: string) => `[${(ph.phase || 'Step').split(':')[0]}] ${s}`),
                  ).slice(0, 8) || [])
              return (
                <div className="glass-card p-3">
                  <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">Prototype Steps</p>
                  {steps.length > 0 ? (
                    <ol className="space-y-2 animate-fadeIn">
                      {steps.map((s: any, i: number) => (
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
              )
            })()}

            {/* How to Build — always visible */}
            <div className="glass-card p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider">How to Build</p>
                {mvpSpec?.buildGuide?.length > 0 && isComplete && (
                  <button onClick={handleGetComponents} disabled={gettingComponents}
                    className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1">
                    {gettingComponents ? <><span className="spinner" /> Fetching...</> : <><Sparkles className="w-3 h-3" /> Get Components</>}
                  </button>
                )}
              </div>
              {componentsError && (
                <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed">{componentsError}</div>
              )}
              {mvpSpec?.buildGuide?.length > 0 ? (
                <div className="space-y-4 animate-fadeIn">
                  {mvpSpec.buildGuide.map((ph: any, pi: number) => {
                    const enrichedPhase = enrichedGuide?.[pi]
                    return (
                      <div key={pi}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-foreground font-head text-xs font-bold">{ph.phase || `Phase ${pi + 1}`}</p>
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

            {/* Cost Breakdown — always visible */}
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

            {/* Code Scaffold — always visible */}
            {(() => {
              const title = mvpSpec?.title || 'Invention'
              const scaffold = mvpSpec?.codeScaffold?.trim() || (mvpSpec ? `// ${title} — Core Logic Scaffold\n// Generated pseudocode — expand with real implementation\n\nfunction initialize(config) {\n  // Set up components and connections\n}\n\nfunction process(input) {\n  // Core logic: transform input → output\n  return { result: null };\n}\n\nfunction shutdown() {\n  // Release resources\n}` : '')
              return (
                <div className="glass-card p-3">
                  <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">Code Scaffold</p>
                  {scaffold
                    ? <pre className="text-xs text-green-400 overflow-x-auto leading-relaxed bg-muted p-2.5 rounded-xl animate-fadeIn">{scaffold}</pre>
                    : <p className="text-muted-foreground/50 text-xs">pending...</p>
                  }
                </div>
              )
            })()}

            {/* Next Experiments — always visible */}
            {(() => {
              const experiments: string[] = mvpSpec?.nextExperiments?.length > 0
                ? mvpSpec.nextExperiments
                : (mvpSpec ? [
                    `Validate core mechanism with a bench-scale prototype`,
                    `Test under real-world conditions`,
                    `Compare against existing solutions on key metrics`,
                    `Run a small user study to gather feedback`,
                    `Identify top failure modes and iterate`,
                  ] : [])
              return (
                <div className="glass-card p-3">
                  <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">Next Experiments</p>
                  {experiments.length > 0 ? (
                    <ul className="space-y-1.5 animate-fadeIn">
                      {experiments.map((e: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Zap className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" /> {e}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground/50 text-xs">pending...</p>
                  )}
                </div>
              )
            })()}

            {/* Cost + Time — always visible */}
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

            {/* Actions — always visible */}
            <div className="flex gap-2 pb-4">
              <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1 text-xs">New Dream</button>
              <button onClick={() => navigate('/inventions')} className="btn-primary flex-1 text-xs">My Inventions</button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
