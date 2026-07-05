// Ported from: inventor-studio-react-app/src/pages/InventionDetail.jsx (695 lines).
// Reads both snake_case (legacy) and camelCase (v3 backend) shapes.
// v3 GET /api/inventions/:id now also returns { agents, synthesis, critique }
// alongside the invention doc — the page reads either shape for backward compat.
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Zap, Download, Brain, CheckCircle, XCircle, Check, X,
  ChevronDown, ChevronUp, RefreshCw, Clock, FileText,
  Cpu, ExternalLink, Package, Database, Sparkles, Share2, GitBranch,
  Radio,
} from 'lucide-react'
import { api } from '@/lib/api'
import { generateInventionPdf } from '@/utils/generatePdf'
import ShareSheet from '@/components/ShareSheet'
import PrototypeCanvas from '@/components/PrototypeCanvas'

// Local axios shims mirroring the source's `services/api.js` exports
const getInvention             = (id: string) => api.get(`/inventions/${id}`)
const exportInvention          = (id: string) => api.get(`/inventions/${id}/export`, { responseType: 'blob' })
const getInventionComponents   = (id: string) => api.post(`/inventions/${id}/components`)
// build-guide and evolve endpoints are not yet implemented on the backend
const generateBuildGuide       = (_id: string) => Promise.reject(new Error('Build guide generation not yet available'))
const evolveInvention          = (_id: string) => Promise.reject(new Error('Evolve not yet available'))

const LENS_COLORS: Record<string, string> = {
  analogical: 'text-yellow-400', inversion: 'text-red-400', crossDomain: 'text-cyan-400',
  extreme: 'text-orange-400', historical: 'text-purple-400', biomimicry: 'text-green-400',
  combinatorial: 'text-pink-400', reduction: 'text-blue-400', scaling: 'text-teal-400',
  future: 'text-violet-400',
}

const LENS_LABELS: Record<string, string> = {
  analogical: 'Analogical', inversion: 'Inversion', crossDomain: 'Cross-Domain',
  extreme: 'Extreme', historical: 'Historical', biomimicry: 'Biomimicry',
  combinatorial: 'Combinatorial', reduction: 'Reduction', scaling: 'Scaling', future: 'Future-Back',
}

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  complete:     { label: 'Complete',     cls: 'chip-green' },
  dreaming:     { label: 'Dreaming',     cls: 'chip-cyan'  },
  searching:    { label: 'Searching',    cls: 'chip-cyan'  },
  synthesizing: { label: 'Synthesizing', cls: 'chip-gold'  },
  critiquing:   { label: 'Critiquing',   cls: 'chip-gold'  },
  pending:      { label: 'Pending',      cls: 'chip-gray'  },
  failed:       { label: 'Failed',       cls: 'chip-red'   },
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

function AgentCard({ lens, output }: { lens: string; output?: string }) {
  const [expanded, setExpanded] = useState(false)
  const color = LENS_COLORS[lens] || 'text-muted-foreground'

  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-3.5 flex items-center gap-3 text-left">
        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-green-400" />
        <span className={`font-head text-sm font-semibold flex-1 ${color}`}>{LENS_LABELS[lens] || lens}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 animate-fadeIn">
          <p className="text-foreground/80 text-xs leading-relaxed">{output}</p>
        </div>
      )}
    </div>
  )
}

const timeAgo = (dateStr?: string) => {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function EnrichedStepView({ step }: { step: any }) {
  if (!step || step.type === 'process') return null
  return (
    <div className="ml-8 mt-2 space-y-2">
      {step.commands?.length > 0 && (
        <pre className="text-xs text-green-700 bg-muted p-3 rounded-xl overflow-x-auto leading-relaxed border border-green-500/10 whitespace-pre-wrap">
          {step.commands.join('\n\n')}
        </pre>
      )}
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
      {step.hardware?.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {step.hardware.map((hw: any, i: number) => (
            <div key={i} className="rounded-xl bg-muted/60 border border-border overflow-hidden">
              {hw.imageUrl
                ? <img src={hw.imageUrl} alt={hw.name} className="w-full h-36 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                : <div className="w-full h-20 bg-muted flex items-center justify-center"><Cpu className="w-8 h-8 text-muted-foreground/50" /></div>
              }
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
            <div key={i} className="rounded-xl bg-muted/60 border border-border p-3">
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
                <pre className="text-xs text-green-400 bg-muted/60 px-2 py-1.5 rounded-lg mt-2 overflow-x-auto">
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

export default function InventionDetail() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [invention, setInvention] = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)
  const [evolving,  setEvolving]  = useState(false)
  const [sharing,   setSharing]   = useState(false)
  const [viewingCircuit,    setViewingCircuit]    = useState(false)
  const [pdfing,            setPdfing]            = useState(false)
  const [enrichedGuide,     setEnrichedGuide]     = useState<any>(null)
  const [gettingComponents, setGettingComponents] = useState(false)
  const [componentsError,   setComponentsError]   = useState<string | null>(null)
  const [generatingBuild,   setGeneratingBuild]   = useState(false)

  useEffect(() => {
    if (!id) return
    getInvention(id)
      .then(({ data }: any) => {
        setInvention(data)
        const inv: any = data?.invention || {}
        const spec: any = inv.invention_spec || inv.inventionSpec
        if (spec?.enrichedGuide?.length) {
          setEnrichedGuide(spec.enrichedGuide)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (!id) return null

  const handleExport = async () => {
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
    setGettingComponents(true)
    setComponentsError(null)
    try {
      const { data } = await getInventionComponents(id)
      if (data.hasRealData) {
        setEnrichedGuide(data.enrichedGuide)
      } else {
        // Don't overwrite existing enriched guide with bad fallback data
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

  const handleGenerateBuildGuide = async () => {
    setGeneratingBuild(true)
    try {
      const { data } = await generateBuildGuide(id)
      // Merge into existing invention state so UI updates without a full reload
      setInvention((prev: any) => {
        const prevInv: any = prev?.invention || prev || {}
        const prevSpec: any = prevInv.invention_spec || prevInv.inventionSpec || {}
        return {
          ...prev,
          invention: {
            ...prevInv,
            invention_spec: {
              ...prevSpec,
              buildGuide: data.buildGuide,
              costBreakdown: data.costBreakdown,
            },
          },
        }
      })
    } catch (e) {
      console.error('Build guide generation failed', e)
    } finally {
      setGeneratingBuild(false)
    }
  }

  const handleViewCircuit = async () => {
    setViewingCircuit(true)
    try {
      const inv: any = invention?.invention || {}
      const concept = inv.title || inv.seedConcept || inv.seed_concept || ''
      navigate(`/electronics?inventionId=${id}&concept=${encodeURIComponent(concept)}`)
    } finally { setViewingCircuit(false) }
  }

  const handleEvolve = async () => {
    setEvolving(true)
    try {
      const { data } = await evolveInvention(id)
      navigate(`/stream/${data.inventionId}`)
    } catch { setEvolving(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="spinner-cyan" />
    </div>
  )

  if (!invention) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Invention not found.</p>
      <button onClick={() => navigate('/inventions')} className="btn-primary px-6">Back to Inventions</button>
    </div>
  )

  // API returns: { invention: row, dreamOutputs|agents, sources, criticism|critique, synthesis }
  // Read both snake_case (legacy) and camelCase (v3) shapes for compatibility.
  const inv: any   = invention.invention || invention
  const status: string = inv.status || 'pending'
  const chip = STATUS_CHIP[status] || STATUS_CHIP.pending
  const mvp: any   = inv.invention_spec || inv.inventionSpec || {}
  const createdAt: string | undefined = inv.created_at || inv.createdAt
  const seedConcept: string = inv.seed_concept || inv.seedConcept || ''

  // Critique: legacy returned criticism[]; v3 GET returns critique object directly on inv
  const crit: any = inv.critique
    || (Array.isArray(invention.criticism) ? invention.criticism[0] : invention.criticism)
    || invention.critique
    || null

  // Synthesis: not stored in legacy DB; v3 returns it on inv or top-level
  const synth: any = inv.synthesis || invention.synthesis || null

  // Agents: legacy = dreamOutputs[{agent_lens,output}]; v3 = inv.agents | invention.agents object map
  const agents: Record<string, string> = (() => {
    const direct = inv.agents || invention.agents
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct
    const arr = invention.dreamOutputs
    if (Array.isArray(arr)) {
      return arr.reduce((acc: Record<string, string>, row: any) => {
        const lens = row.agent_lens || row.lens
        if (lens) acc[lens] = row.output
        return acc
      }, {})
    }
    return {}
  })()

  return (
    <div className="h-screen bg-background flex flex-col items-center overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-md flex items-center gap-3 p-5 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => navigate('/inventions')} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-head font-bold text-sm truncate">{inv.title || seedConcept}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`chip ${chip.cls}`}>{chip.label}</span>
            {inv.domain && <span className="chip chip-gray">{inv.domain}</span>}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" /> {timeAgo(createdAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleViewCircuit} disabled={viewingCircuit}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="View Circuit Diagram" style={{ color: '#3b82f6', borderColor: 'rgba(59,130,246,0.2)' } as React.CSSProperties}>
            {viewingCircuit ? <span className="spinner" /> : <Radio className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />}
          </button>
          <button onClick={() => setSharing(true)}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
            {exporting ? <span className="spinner" /> : <Download className="w-3.5 h-3.5" />}
            MD
          </button>
          <button onClick={async () => {
            setPdfing(true)
            try {
              await generateInventionPdf({
                invention: {
                  title: mvp?.title || inv.title,
                  domain: mvp?.domain || inv.domain,
                  seed_concept: seedConcept,
                  created_at: createdAt,
                },
                agents,
                synthesis: synth,
                critique: crit,
                mvpSpec: mvp,
                seedConcept,
                enrichedGuide,
              })
            } catch (e) { console.error('PDF error', e) }
            finally { setPdfing(false) }
          }} disabled={pdfing}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5">
            {pdfing ? <span className="spinner" /> : <FileText className="w-3.5 h-3.5" />}
            PDF
          </button>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-5 overflow-y-auto w-full max-w-md">

        {/* Prototype Canvas */}
        {mvp?.prototypeCanvas?.nodes?.length > 0 && (
          <div className="glass-card p-4 animate-fadeIn">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-3.5 h-3.5 text-primary" />
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider">Prototype Canvas</p>
              <span className="chip chip-gold ml-auto">{mvp.prototypeCanvas.nodes.length} components</span>
            </div>
            <PrototypeCanvas canvasData={mvp.prototypeCanvas} title={mvp.title} />
          </div>
        )}

        {/* Code Scaffold — view-only console */}
        {mvp && Object.keys(mvp).length > 0 && (() => {
          const scaffold = mvp.codeScaffold?.trim() ||
            `// ${mvp.title || 'Invention'} — Core Logic Scaffold\n// Generated pseudocode — expand with real implementation\n\nfunction initialize(config) {\n  // Set up components and connections\n}\n\nfunction process(input) {\n  // Core logic: transform input → output\n  return { result: null };\n}\n\nfunction shutdown() {\n  // Release resources\n}`
          return (
            <div className="glass-card p-4 animate-fadeIn">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Code Scaffold</p>
              <pre className="text-xs text-green-400 overflow-x-auto leading-relaxed bg-muted/60 p-3 rounded-xl">{scaffold}</pre>
            </div>
          )
        })()}

        {/* MVP Spec */}
        {mvp && Object.keys(mvp).length > 0 && (
          <div className="glass-card-gold p-5 animate-fadeIn">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-primary font-head text-xs font-bold uppercase tracking-wider mb-1">MVP Specification</p>
                <h2 className="font-head text-xl font-bold text-foreground">{mvp.title}</h2>
              </div>
              {mvp.domain && <span className="chip chip-gold flex-shrink-0">{mvp.domain}</span>}
            </div>
            {mvp.oneLiner && <p className="text-foreground/80 text-sm leading-relaxed mb-4">{mvp.oneLiner}</p>}
            <div className="space-y-3">
              <ScoreBar label="Novelty"     value={mvp.noveltyScore}     colorClass="gold"  />
              <ScoreBar label="Feasibility" value={mvp.feasibilityScore} colorClass="cyan"  />
              <ScoreBar label="Impact"      value={mvp.impactScore}      colorClass="green" />
            </div>
          </div>
        )}

        {/* Seed Concept (if different from title) */}
        {seedConcept && inv.title && seedConcept !== inv.title && (
          <div className="glass-card p-4 animate-fadeIn">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-1">Original Concept</p>
            <p className="text-foreground/80 text-sm">{seedConcept}</p>
          </div>
        )}

        {/* Problem Solved */}
        {mvp && Object.keys(mvp).length > 0 && (() => {
          const text = mvp.problemSolved?.trim() ||
            (mvp.concept ? `${mvp.title || 'This invention'} addresses: ${mvp.concept.slice(0, 220)}${mvp.concept.length > 220 ? '...' : ''}` : '')
          return text ? (
            <div className="glass-card p-4 animate-fadeIn">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">Problem Solved</p>
              <p className="text-foreground/80 text-sm leading-relaxed">{text}</p>
            </div>
          ) : null
        })()}

        {/* Components */}
        {mvp && Object.keys(mvp).length > 0 && (() => {
          const items: any[] = mvp.components?.length > 0
            ? mvp.components
            : (mvp.buildGuide?.flatMap((ph: any) => ph.steps.slice(0, 1)).slice(0, 5) || [])
          return items.length > 0 ? (
            <div className="glass-card p-4 animate-fadeIn">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Components</p>
              <ul className="space-y-2">
                {items.map((c: any, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-primary font-bold flex-shrink-0 font-head">{i + 1}.</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        })()}

        {/* Prototype Steps */}
        {mvp && Object.keys(mvp).length > 0 && (() => {
          const steps: any[] = mvp.prototypeSteps?.length > 0
            ? mvp.prototypeSteps
            : (mvp.buildGuide?.flatMap((ph: any) =>
                ph.steps.map((s: string) => `[${(ph.phase || 'Step').split(':')[0]}] ${s}`),
              ).slice(0, 8) || [])
          return steps.length > 0 ? (
            <div className="glass-card p-4 animate-fadeIn">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Prototype Steps</p>
              <ol className="space-y-3">
                {steps.map((s: any, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold font-head flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-foreground/80 text-sm leading-relaxed">{s}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null
        })()}

        {/* How to Build */}
        {mvp && Object.keys(mvp).length > 0 && (
          <div className="glass-card p-4 animate-fadeIn">
            <div className="mb-4">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">How to Build — Step by Step</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateBuildGuide}
                  disabled={generatingBuild}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  {generatingBuild
                    ? <><span className="spinner" /> Generating...</>
                    : <><Zap className="w-3 h-3" /> {mvp.buildGuide?.length > 0 ? 'Regenerate' : 'Generate'}</>}
                </button>
                {mvp.buildGuide?.length > 0 && (
                  <button
                    onClick={handleGetComponents}
                    disabled={gettingComponents}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    {gettingComponents
                      ? <><span className="spinner" /> Fetching...</>
                      : <><Sparkles className="w-3 h-3" /> Get Components</>}
                  </button>
                )}
              </div>
            </div>
            {componentsError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed">
                {componentsError}
              </div>
            )}
            {mvp.buildGuide?.length > 0 ? (
              <div className="space-y-5">
                {(mvp.buildGuide || []).map((phase: any, pi: number) => {
                  const enrichedPhase = enrichedGuide?.[pi]
                  return (
                    <div key={pi}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-foreground font-head text-sm font-bold">{phase.phase || `Phase ${pi + 1}`}</p>
                        {phase.duration && <span className="chip chip-gray text-xs">{phase.duration}</span>}
                      </div>
                      <ol className="space-y-4 pl-1">
                        {phase.steps?.map((step: string, si: number) => {
                          const enriched = enrichedPhase?.enrichedSteps?.[si]
                          return (
                            <li key={si}>
                              <div className="flex items-start gap-3">
                                <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 text-xs font-bold font-head flex items-center justify-center flex-shrink-0 mt-0.5">{si + 1}</span>
                                <p className="text-foreground/80 text-xs leading-relaxed">{step || enriched?.stepText}</p>
                              </div>
                              {enriched && <EnrichedStepView step={enriched} />}
                            </li>
                          )
                        })}
                      </ol>
                      {pi < mvp.buildGuide.length - 1 && <div className="mt-4 border-b border-border" />}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">No build guide yet. Click "Generate" above to create one.</p>
            )}
          </div>
        )}

        {/* Cost Breakdown */}
        {mvp && Object.keys(mvp).length > 0 && (
          <div className="glass-card p-4 animate-fadeIn">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Cost Breakdown</p>
            {mvp.costBreakdown?.items?.length > 0 ? (
              <>
                <div className="space-y-2 mb-3">
                  {mvp.costBreakdown.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="text-foreground text-xs font-semibold">{item.name}</p>
                        {item.notes && <p className="text-muted-foreground text-xs mt-0.5">{item.notes}</p>}
                      </div>
                      <span className="text-primary font-head font-bold text-xs flex-shrink-0">{item.cost}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <p className="text-foreground font-head text-sm font-bold">Total Estimate</p>
                  <p className="text-primary font-head font-bold text-sm">{mvp.costBreakdown.totalEstimate}</p>
                </div>
                {mvp.costBreakdown.notes && (
                  <p className="text-muted-foreground text-xs mt-2 leading-relaxed">{mvp.costBreakdown.notes}</p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-muted-foreground text-xs">No cost breakdown yet for this invention.</p>
                <button
                  onClick={handleGenerateBuildGuide}
                  disabled={generatingBuild}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  {generatingBuild
                    ? <><span className="spinner" /> Generating...</>
                    : <><Zap className="w-3 h-3" /> Generate Cost Breakdown</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Next Experiments */}
        {mvp && Object.keys(mvp).length > 0 && (() => {
          const experiments: string[] = mvp.nextExperiments?.length > 0
            ? mvp.nextExperiments
            : [
                `Validate core mechanism of ${mvp.title || 'this invention'} with a bench-scale prototype`,
                `Test performance under real-world environmental conditions`,
                `Compare against existing solutions on key metrics`,
                `Run a small user study to gather qualitative feedback`,
                `Identify top failure modes and iterate on the design`,
              ]
          return (
            <div className="glass-card p-4 animate-fadeIn">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Next Experiments</p>
              <ul className="space-y-2">
                {experiments.map((e: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" /> {e}
                  </li>
                ))}
              </ul>
            </div>
          )
        })()}

        {/* Cost + Time */}
        {(mvp?.estimatedPrototypeCost || mvp?.timeToPrototype) && (
          <div className="grid grid-cols-2 gap-3 animate-fadeIn">
            <div className="glass-card p-4">
              <p className="text-muted-foreground text-xs mb-1">Prototype Cost</p>
              <p className="text-foreground font-head font-bold text-sm">{mvp.costBreakdown?.totalEstimate || mvp.estimatedPrototypeCost || '—'}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-muted-foreground text-xs mb-1">Time to Build</p>
              <p className="text-foreground font-head font-bold text-sm">{mvp.timeToPrototype || '—'}</p>
            </div>
          </div>
        )}

        {/* Critique */}
        {crit && (
          <div className={`p-4 rounded-xl animate-fadeIn border ${crit.verdict === 'survives' ? 'bg-green-500/5 border-green-500/20' : crit.verdict === 'killed' ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
            <div className="flex items-center gap-2 mb-2">
              {crit.verdict === 'killed'
                ? <XCircle className="w-4 h-4 text-red-400" />
                : <CheckCircle className="w-4 h-4 text-green-400" />}
              <p className={`font-head text-xs font-bold uppercase tracking-wider ${crit.verdict === 'killed' ? 'text-red-400' : crit.verdict === 'survives' ? 'text-green-400' : 'text-yellow-400'}`}>
                Critic: {crit.verdict}
              </p>
              <span className="ml-auto text-xs text-muted-foreground">
                Novelty {Math.round((crit.finalNoveltyScore || 0) * 100)}%
              </span>
            </div>
            {crit.reason && <p className="text-foreground/80 text-xs leading-relaxed mb-2">{crit.reason}</p>}
            {crit.challenges?.length > 0 && (
              <ul className="space-y-1 mt-2">
                {crit.challenges.map((c: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <X size={14} className="text-red-500 inline mt-0.5 flex-shrink-0" /> {c}
                  </li>
                ))}
              </ul>
            )}
            {crit.refinements?.length > 0 && (
              <ul className="space-y-1 mt-2">
                {crit.refinements.map((r: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Check size={14} className="text-green-500 inline mt-0.5 flex-shrink-0" /> {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Synthesis */}
        {synth && (
          <div className="glass-card-gold p-4 animate-fadeIn">
            <p className="text-primary font-head text-xs font-bold uppercase tracking-wider mb-3">Synthesis</p>
            {synth.emergentInsight && (
              <p className="text-foreground/80 text-sm leading-relaxed mb-4 italic">"{synth.emergentInsight}"</p>
            )}
            {synth.topInventions?.slice(0, 3).map((tinv: any, i: number) => (
              <div key={i} className="mb-3 last:mb-0 p-3 rounded-xl bg-muted/40">
                <p className="text-foreground font-head text-sm font-bold mb-1">{tinv.title}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{tinv.concept?.slice(0, 250)}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {tinv.sourceLenses?.map((l: string) => (
                    <span key={l} className={`text-xs font-head font-bold ${LENS_COLORS[l] || 'text-muted-foreground'}`}>#{l}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dream Agents */}
        {Object.keys(agents).length > 0 && (
          <div className="animate-fadeIn">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" /> Dream Agents
              <span className="chip chip-gold ml-auto">{Object.keys(agents).length}/10</span>
            </p>
            <div className="space-y-2">
              {Object.entries(agents).map(([lens, output]) => (
                <AgentCard key={lens} lens={lens} output={output} />
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {invention.sources?.length > 0 && (
          <div className="glass-card p-4 animate-fadeIn">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Sources ({invention.sources.length})</p>
            <ul className="space-y-2">
              {invention.sources.map((s: any, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="chip chip-gray flex-shrink-0 mt-0.5">{s.source_type || s.sourceType || 'web'}</span>
                  <div className="min-w-0">
                    <p className="text-foreground/80 text-xs truncate">{s.title || s.url}</p>
                    {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-muted-foreground text-xs hover:text-primary truncate block">{s.url}</a>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-6 animate-fadeIn">
          <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1">New Dream</button>
          <button onClick={handleEvolve} disabled={evolving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {evolving ? <><span className="spinner" /> Evolving...</> : <><RefreshCw className="w-4 h-4" /> Evolve</>}
          </button>
        </div>

      </div>

      {sharing && (
        <ShareSheet
          inventionId={id}
          title={inv.title || seedConcept}
          initialIsPublic={!!(invention?.isPublic ?? invention?.is_public)}
          onVisibilityChange={(isPublic) =>
            setInvention((prev: any) => (prev ? { ...prev, isPublic, is_public: isPublic } : prev))
          }
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  )
}
