// Public read-only view of an entire dream invention.
// Mirrors InventionDetail.tsx section-for-section: MVP spec, problem solved,
// components, prototype steps, build guide, cost breakdown, next experiments,
// critique, synthesis, all 10 dream agents, sources. Action buttons (Generate,
// Get Components, Evolve) are replaced with locked badges + sign-up CTA.
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Zap, ArrowRight, FileText, XCircle, ChevronLeft, Lock, Brain,
  CheckCircle, ChevronDown, ChevronUp, Cpu, ExternalLink, Package,
  Database, GitBranch, Check, X,
} from 'lucide-react'
import { generateInventionPdf } from '@/utils/generatePdf'
import { api } from '@/lib/api'
import PrototypeCanvas from '@/components/PrototypeCanvas'

// v3 backend exposes the public read at /api/public/invention/:id
// Returns the FULL doc (inventionSpec, agents, synthesis, critique, etc.)
const getShowcaseInvention = (id: string) => api.get(`/public/invention/${id}`)

const LENS_COLORS: Record<string, string> = {
  analogical: 'text-yellow-400', inversion: 'text-red-400', crossDomain: 'text-cyan-400',
  extreme: 'text-orange-400', historical: 'text-purple-400', biomimicry: 'text-green-700',
  combinatorial: 'text-pink-400', reduction: 'text-blue-400', scaling: 'text-teal-400',
  future: 'text-violet-400',
}

const LENS_LABELS: Record<string, string> = {
  analogical: 'Analogical', inversion: 'Inversion', crossDomain: 'Cross-Domain',
  extreme: 'Extreme', historical: 'Historical', biomimicry: 'Biomimicry',
  combinatorial: 'Combinatorial', reduction: 'Reduction', scaling: 'Scaling', future: 'Future-Back',
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

function LockedBadge({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'var(--muted)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '6px 12px', opacity: 0.7,
    }}>
      <Lock size={12} color="#94a3b8" />
      <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'Kanit, sans-serif' }}>{label}</span>
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
          <p className="text-foreground/80 text-xs leading-relaxed whitespace-pre-wrap">{output}</p>
        </div>
      )}
    </div>
  )
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
                <pre className="text-xs text-green-700 bg-muted/60 px-2 py-1.5 rounded-lg mt-2 overflow-x-auto">
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

export default function ShowcaseView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [invention, setInvention] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfing, setPdfing] = useState(false)

  useEffect(() => {
    if (!id) return
    getShowcaseInvention(id)
      .then(({ data }: any) => setInvention(data.invention))
      .catch(() => setError('Invention not found'))
      .finally(() => setLoading(false))
  }, [id])

  // Read both snake_case (legacy) and camelCase (v3) shapes
  const inv: any = invention || {}
  const mvp: any = inv.invention_spec || inv.inventionSpec || {}
  const seedConcept: string = inv.seed_concept || inv.seedConcept || ''
  const createdAt: string | undefined = inv.created_at || inv.createdAt
  const crit: any = inv.critique || null
  const synth: any = inv.synthesis || null
  const enrichedGuide: any = mvp.enrichedBuildGuide || null

  const agents: Record<string, string> = (() => {
    const direct = inv.agents
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct
    return {}
  })()

  const handlePdf = async () => {
    setPdfing(true)
    try {
      await generateInventionPdf({
        invention: {
          title: mvp.title || inv.title,
          domain: mvp.domain || inv.domain,
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
  }

  if (loading) return (
    <div className="bg-background" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader-spinner loader-spinner-lg" />
    </div>
  )

  if (error || !invention) return (
    <div className="bg-background" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <XCircle size={40} color="#f87171" />
      <p style={{ color: '#f87171', fontFamily: 'Kanit, sans-serif', fontSize: 18 }}>{error || 'Invention not found'}</p>
      <button onClick={() => navigate('/')} className="btn-secondary">Back to Home</button>
    </div>
  )

  const title: string = mvp.title || inv.title || seedConcept
  const domain: string | undefined = mvp.domain || inv.domain

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Sticky header */}
      <div style={{
        width: '100%', maxWidth: 448, borderBottom: '1px solid var(--border)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: 'rgba(248,250,252,0.95)', backdropFilter: 'blur(12px)', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)',
              display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={13} color="#000" fill="#000" />
          </div>
          <div>
            <span style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 700, color: 'var(--foreground)', fontSize: 14 }}>
              Invention Preview
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9, color: 'var(--muted-foreground)', fontFamily: 'Kanit, sans-serif',
                background: 'var(--muted)', border: '1px solid var(--border)',
                padding: '1px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                View Only
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePdf} disabled={pdfing} className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
            {pdfing ? <span className="spinner" /> : <FileText size={12} />} PDF
          </button>
          <button onClick={() => navigate('/signup')} className="btn-primary"
            style={{ padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
            Sign Up <ArrowRight size={12} />
          </button>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 448, padding: '20px 20px 60px' }} className="space-y-4">

        {/* Prototype Canvas */}
        {mvp?.prototypeCanvas?.nodes?.length > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-3.5 h-3.5 text-primary" />
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider">Prototype Canvas</p>
              <span className="chip chip-gold ml-auto">{mvp.prototypeCanvas.nodes.length} components</span>
            </div>
            <PrototypeCanvas canvasData={mvp.prototypeCanvas} title={mvp.title} />
          </div>
        )}

        {/* Code Scaffold */}
        {mvp.codeScaffold && (
          <div className="glass-card p-4">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Code Scaffold</p>
            <pre className="text-xs text-green-700 overflow-x-auto leading-relaxed bg-muted/60 p-3 rounded-xl whitespace-pre-wrap">{mvp.codeScaffold}</pre>
          </div>
        )}

        {/* MVP Spec card with scores */}
        <div className="glass-card-gold p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-primary font-head text-xs font-bold uppercase tracking-wider mb-1">MVP Specification</p>
              <h1 className="font-head text-xl font-bold text-foreground leading-tight">{title}</h1>
            </div>
            {domain && <span className="chip chip-gold flex-shrink-0">{domain}</span>}
          </div>
          {mvp.oneLiner && (
            <p className="text-foreground/80 text-sm leading-relaxed mb-4">{mvp.oneLiner}</p>
          )}
          <div className="space-y-3">
            <ScoreBar label="Novelty"     value={mvp.noveltyScore     ?? inv.novelty_score     ?? inv.noveltyScore}     colorClass="gold"  />
            <ScoreBar label="Feasibility" value={mvp.feasibilityScore ?? inv.feasibility_score ?? inv.feasibilityScore} colorClass="cyan"  />
            <ScoreBar label="Impact"      value={mvp.impactScore      ?? inv.impact_score      ?? inv.impactScore}      colorClass="green" />
          </div>
        </div>

        {/* Original Concept (if different from title) */}
        {seedConcept && title && seedConcept !== title && (
          <div className="glass-card p-4">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-1">Original Concept</p>
            <p className="text-foreground/80 text-sm">{seedConcept}</p>
          </div>
        )}

        {/* Problem Solved */}
        {mvp.problemSolved && (
          <div className="glass-card p-4">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-2">Problem Solved</p>
            <p className="text-foreground/80 text-sm leading-relaxed">{mvp.problemSolved}</p>
          </div>
        )}

        {/* Components */}
        {mvp.components?.length > 0 && (
          <div className="glass-card p-4">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Components</p>
            <ul className="space-y-2">
              {mvp.components.map((c: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="text-primary font-bold flex-shrink-0 font-head">{i + 1}.</span> {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Prototype Steps */}
        {mvp.prototypeSteps?.length > 0 && (
          <div className="glass-card p-4">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Prototype Steps</p>
            <ol className="space-y-3">
              {mvp.prototypeSteps.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold font-head flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-foreground/80 text-sm leading-relaxed">{s}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* How to Build */}
        {mvp.buildGuide?.length > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider">How to Build</p>
              <LockedBadge label="Get Components — Sign Up" />
            </div>
            <div className="space-y-5">
              {mvp.buildGuide.map((phase: any, pi: number) => {
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
          </div>
        )}

        {/* Cost Breakdown */}
        {mvp.costBreakdown?.items?.length > 0 && (
          <div className="glass-card p-4">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Cost Breakdown</p>
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
          </div>
        )}

        {/* Next Experiments */}
        {mvp.nextExperiments?.length > 0 && (
          <div className="glass-card p-4">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Next Experiments</p>
            <ul className="space-y-2">
              {mvp.nextExperiments.map((e: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" /> {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cost + Time grid */}
        {(mvp.costBreakdown?.totalEstimate || mvp.estimatedPrototypeCost || mvp.timeToPrototype) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <p className="text-muted-foreground text-xs mb-1">Prototype Cost</p>
              <p className="text-foreground font-head font-bold text-sm">
                {mvp.costBreakdown?.totalEstimate || mvp.estimatedPrototypeCost || '—'}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-muted-foreground text-xs mb-1">Time to Build</p>
              <p className="text-foreground font-head font-bold text-sm">{mvp.timeToPrototype || '—'}</p>
            </div>
          </div>
        )}

        {/* Critique */}
        {crit && (
          <div className={`p-4 rounded-xl border ${crit.verdict === 'survives' ? 'bg-green-500/5 border-green-500/20' : crit.verdict === 'killed' ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
            <div className="flex items-center gap-2 mb-2">
              {crit.verdict === 'killed'
                ? <XCircle className="w-4 h-4 text-red-400" />
                : <CheckCircle className="w-4 h-4 text-green-700" />}
              <p className={`font-head text-xs font-bold uppercase tracking-wider ${crit.verdict === 'killed' ? 'text-red-400' : crit.verdict === 'survives' ? 'text-green-700' : 'text-yellow-400'}`}>
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
          <div className="glass-card-gold p-4">
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
          <div>
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
        {Array.isArray(inv.sources) && inv.sources.length > 0 && (
          <div className="glass-card p-4">
            <p className="text-muted-foreground font-head text-xs font-bold uppercase tracking-wider mb-3">Sources ({inv.sources.length})</p>
            <ul className="space-y-2">
              {inv.sources.map((s: any, i: number) => (
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

        {/* Sign-up CTA */}
        <div style={{
          background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <p style={{ fontFamily: 'Kanit, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
            Want to generate your own inventions?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Get Components', 'Evolve Idea', 'Save to Profile', 'Invent Mode'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--muted)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '4px 10px', opacity: 0.7 }}>
                <Lock size={10} color="#94a3b8" />
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'Kanit, sans-serif' }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/signup')} className="btn-primary"
              style={{ padding: '10px 20px', fontSize: 13 }}>
              Create Free Account <ArrowRight size={14} style={{ display: 'inline', marginLeft: 4 }} />
            </button>
            <button onClick={() => navigate('/')} className="btn-ghost" style={{ fontSize: 13 }}>
              Try Without Account
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#444' }}>3 free inventions · No credit card required</p>
        </div>
      </div>
    </div>
  )
}
