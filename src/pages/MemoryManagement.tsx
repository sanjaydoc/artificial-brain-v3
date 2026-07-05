import { useState, useEffect, useCallback } from 'react'
import {
  Brain, Database, HardDrive, Cpu, GitBranch, Zap, RefreshCw,
  Search, ChevronDown, ChevronUp, Trash2, Clock, Activity,
  Layers, BarChart3, Network,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────── */

interface MemoryEntry {
  node: string
  type: string
  content: string
  importance: number
  term: string
  ts: number
}

interface Fact {
  target: string
  relation: string
}

interface NodeStats {
  short: number
  long: number
}

interface BrainState {
  thalamus?: {
    signal_log?: { from: string; to?: string; type: string; summary?: string; ts?: number }[]
    active_nodes?: string[]
    message_count?: number
  }
  prefrontal?: {
    current_goal?: string
    confidence?: number
    emotion?: string
    world_model?: Record<string, unknown>
    plan_step?: number
  }
  cerebellum?: {
    last_action?: number[]
    sim_reward?: number
    sim_step?: number
    rl_mode?: string
    sim_fallen?: boolean
  }
  amygdala?: {
    valence?: number
    arousal?: number
    emotion?: string
  }
  basalGanglia?: {
    habit_count?: number
    best_habit?: string
    best_strength?: number
  }
  hippocampus?: Record<string, unknown>
  broca?: { last_utterance?: string }
  [key: string]: unknown
}

/* ── Brain Nodes ───────────────────────────────────────────── */

const BRAIN_NODES = [
  'prefrontal', 'hippocampus', 'amygdala', 'cerebellum', 'broca',
  'wernicke', 'visual_cortex', 'temporal_lobe', 'parietal_lobe',
  'basal_ganglia', 'insula', 'cingulate', 'thalamus', 'brainstem',
]

const NODE_COLORS: Record<string, string> = {
  prefrontal: '#22d3ee', hippocampus: '#4ade80', amygdala: '#f472b6',
  cerebellum: '#f59e0b', broca: '#a78bfa', wernicke: '#818cf8',
  visual_cortex: '#38bdf8', temporal_lobe: '#34d399', parietal_lobe: '#fbbf24',
  thalamus: '#f59e0b', basal_ganglia: '#f87171', insula: '#c084fc',
  cingulate: '#86efac', brainstem: '#94a3b8',
}

const NODE_ROLES: Record<string, string> = {
  prefrontal: 'Planning & Goals', hippocampus: 'Episodic Memory', amygdala: 'Emotion',
  cerebellum: 'Motor / RL', broca: 'Speech Output', wernicke: 'Language Input',
  visual_cortex: 'Vision', temporal_lobe: 'Knowledge Graph', parietal_lobe: 'Sensors',
  thalamus: 'Signal Router', basal_ganglia: 'Habits', insula: 'Health Monitor',
  cingulate: 'Conflict Resolution', brainstem: 'Heartbeat',
}

/* ── Memory System Descriptions ────────────────────────────── */

const MEMORY_SYSTEMS = [
  {
    id: 'episodic', label: 'Episodic Memory', icon: <Brain className="w-4 h-4" />,
    color: '#3b82f6', storage: 'Neo4j',
    desc: 'Short-term and long-term memories per brain node. Consolidation promotes important memories and prunes weak ones.',
  },
  {
    id: 'knowledge', label: 'Knowledge Graph', icon: <Network className="w-4 h-4" />,
    color: '#14b8a6', storage: 'Neo4j',
    desc: 'Semantic concept-relation-target facts. Temporal lobe learns and recalls structured knowledge.',
  },
  {
    id: 'working', label: 'Working Memory', icon: <Cpu className="w-4 h-4" />,
    color: '#22d3ee', storage: 'In-Memory',
    desc: 'Prefrontal cortex world model: current goal, emotion, confidence, position, brightness, intent.',
  },
  {
    id: 'motor', label: 'Motor Memory', icon: <Activity className="w-4 h-4" />,
    color: '#f59e0b', storage: 'Neo4j + Sim',
    desc: 'Cerebellum records significant motor episodes (reward > 0.3) with joint states and RL mode.',
  },
  {
    id: 'habits', label: 'Habit Memory', icon: <Zap className="w-4 h-4" />,
    color: '#f87171', storage: 'In-Memory',
    desc: 'Basal ganglia habit table: action → count/reward/strength. Max 100 habits, weakest auto-evicted.',
  },
  {
    id: 'emotional', label: 'Emotional Memory', icon: <Layers className="w-4 h-4" />,
    color: '#f472b6', storage: 'Neo4j',
    desc: 'Amygdala tracks valence/arousal and stores emotional responses to stimuli.',
  },
  {
    id: 'vector', label: 'Vector Store', icon: <Database className="w-4 h-4" />,
    color: '#8b5cf6', storage: 'MongoDB',
    desc: 'Inventor Studio knowledge embeddings for semantic search (papers, patents, web content).',
  },
  {
    id: 'invention', label: 'Invention Knowledge', icon: <GitBranch className="w-4 h-4" />,
    color: '#16a34a', storage: 'MongoDB',
    desc: 'Invention/concept nodes with embeddings and edges (CONNECTS_TO, INSPIRED_BY, SIMILAR_TO).',
  },
]

/* ── Helpers ───────────────────────────────────────────────── */

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/* ── Main Component ────────────────────────────────────────── */

export default function MemoryManagement() {
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [stats, setStats] = useState<Record<string, NodeStats>>({})
  const [brainState, setBrainState] = useState<BrainState | null>(null)
  const [concept, setConcept] = useState('')
  const [facts, setFacts] = useState<Fact[]>([])
  const [queriedConcept, setQueriedConcept] = useState('')
  const [filterNode, setFilterNode] = useState('')
  const [filterTerm, setFilterTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set(['episodic', 'knowledge', 'working']))
  const [autoRefresh, setAutoRefresh] = useState(true)

  const toggleSystem = (id: string) => {
    setExpandedSystems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const loadMemories = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterNode) params.set('node', filterNode)
    if (filterTerm) params.set('term', filterTerm)
    params.set('limit', '100')
    try {
      const r = await fetch(`/api/brain/memory?${params}`)
      const data = await r.json()
      if (data.ok) setMemories(data.memories || [])
    } catch {}
  }, [filterNode, filterTerm])

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch('/api/brain/memory/stats')
      const data = await r.json()
      if (data.ok) setStats(data.stats || {})
    } catch {}
  }, [])

  const loadBrainState = useCallback(async () => {
    try {
      const r = await fetch('/api/brain/state')
      const data = await r.json()
      setBrainState(data)
    } catch {}
  }, [])

  const queryKnowledge = useCallback(async () => {
    if (!concept.trim()) return
    try {
      const r = await fetch(`/api/brain/knowledge/${encodeURIComponent(concept.trim())}`)
      const data = await r.json()
      if (data.ok) {
        setFacts(data.facts || [])
        setQueriedConcept(concept.trim())
      }
    } catch {}
  }, [concept])

  const loadAll = useCallback(async () => {
    await Promise.all([loadMemories(), loadStats(), loadBrainState()])
    setLoading(false)
  }, [loadMemories, loadStats, loadBrainState])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (!autoRefresh) return
    const iv = setInterval(loadAll, 5000)
    return () => clearInterval(iv)
  }, [autoRefresh, loadAll])

  const totalShort = Object.values(stats).reduce((s, v) => s + v.short, 0)
  const totalLong = Object.values(stats).reduce((s, v) => s + v.long, 0)
  const totalMemories = totalShort + totalLong
  const activeNodes = brainState?.thalamus?.active_nodes || []
  const signalCount = brainState?.thalamus?.message_count || 0

  const prefrontal = brainState?.prefrontal
  const cerebellum = brainState?.cerebellum
  const amygdala = brainState?.amygdala
  const basalGanglia = brainState?.basalGanglia
  const broca = brainState?.broca

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Artificial Brain v3</p>
          <h1 className="text-lg font-kanit font-semibold text-foreground">
            Memory Management
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            8 memory systems · {totalMemories} episodic memories · {activeNodes.length} active nodes · {signalCount} signals
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
          <button onClick={loadAll}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-20"><span className="loader" /></div>
      )}

      {!loading && (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Memories</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalMemories}</p>
              <p className="text-xs text-muted-foreground mt-1">{totalShort} short · {totalLong} long-term</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Active Nodes</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{activeNodes.length}</p>
              <p className="text-xs text-muted-foreground mt-1">of 14 brain modules</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Signals</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{signalCount}</p>
              <p className="text-xs text-muted-foreground mt-1">total bus messages</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Current Goal</span>
              </div>
              <p className="text-sm font-semibold text-foreground truncate">{prefrontal?.current_goal || '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {prefrontal?.emotion || '—'} · {((prefrontal?.confidence || 0) * 100).toFixed(0)}% conf
              </p>
            </div>
          </div>

          {/* Per-node memory stats grid */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> Memory Distribution by Node
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {BRAIN_NODES.map(node => {
                const s = stats[node]
                const color = NODE_COLORS[node] || '#6b7280'
                const isActive = activeNodes.includes(node)
                return (
                  <div key={node}
                    className={`rounded-xl border p-3 transition-all ${isActive ? 'border-primary/30 bg-primary/[0.04]' : 'border-border'}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: isActive ? `0 0 6px ${color}` : 'none' }} />
                      <span className="text-[0.6rem] font-semibold text-foreground truncate">{node}</span>
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground mb-1.5">{NODE_ROLES[node]}</p>
                    {s ? (
                      <div className="flex gap-2 text-[0.6rem]">
                        <span className="text-primary font-mono">S:{s.short}</span>
                        <span className="text-primary font-mono">L:{s.long}</span>
                      </div>
                    ) : (
                      <span className="text-[0.6rem] text-muted-foreground">—</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 8 Memory Systems */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Memory Systems</h2>

            {MEMORY_SYSTEMS.map(sys => {
              const isOpen = expandedSystems.has(sys.id)
              return (
                <div key={sys.id} className="rounded-xl bg-card border border-border overflow-hidden">
                  <button
                    onClick={() => toggleSystem(sys.id)}
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-lg grid place-items-center border shrink-0"
                      style={{ background: `${sys.color}15`, borderColor: `${sys.color}30`, color: sys.color }}>
                      {sys.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{sys.label}</span>
                        <span className="chip chip-gray text-[0.6rem]">{sys.storage}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{sys.desc}</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-border p-4 animate-fadeIn">
                      {/* Episodic Memory */}
                      {sys.id === 'episodic' && (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <select value={filterNode} onChange={e => setFilterNode(e.target.value)}
                              className="bg-muted border border-border rounded-lg px-3 py-1.5 text-xs text-foreground">
                              <option value="">All Nodes</option>
                              {BRAIN_NODES.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
                              className="bg-muted border border-border rounded-lg px-3 py-1.5 text-xs text-foreground">
                              <option value="">All Terms</option>
                              <option value="short">Short-term</option>
                              <option value="long">Long-term</option>
                            </select>
                            <button onClick={loadMemories}
                              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" /> Refresh
                            </button>
                          </div>
                          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                            {memories.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-8">No episodic memories found. The brain needs to be running.</p>
                            )}
                            {memories.map((m, i) => (
                              <div key={i} className="rounded-xl border border-border p-3 hover:border-primary/20 transition-all">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[m.node] || '#6b7280' }} />
                                  <span className="text-xs font-semibold text-foreground">{m.node}</span>
                                  <span className="text-[0.6rem] text-muted-foreground">{m.type}</span>
                                  <span className={`ml-auto text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${
                                    m.term === 'long' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {m.term}
                                  </span>
                                  <span className="text-[0.6rem] text-muted-foreground">{(m.importance || 0).toFixed(2)}</span>
                                  <span className="text-[0.6rem] text-muted-foreground">{timeAgo(m.ts)}</span>
                                </div>
                                <p className="text-xs text-foreground leading-relaxed">{m.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Knowledge Graph */}
                      {sys.id === 'knowledge' && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input
                              value={concept}
                              onChange={e => setConcept(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && queryKnowledge()}
                              placeholder="Search concept..."
                              className="input-field flex-1 text-sm"
                            />
                            <button onClick={queryKnowledge} className="btn-primary text-xs py-2 px-4">
                              <Search className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {['walk', 'environment', 'visual_input', 'balance', 'reward', 'goal', 'emotion', 'motor'].map(c => (
                              <button key={c} onClick={() => { setConcept(c); setTimeout(() => {
                                fetch(`/api/brain/knowledge/${c}`).then(r => r.json()).then(d => {
                                  if (d.ok) { setFacts(d.facts || []); setQueriedConcept(c) }
                                })
                              }, 0) }}
                                className="px-2.5 py-1 rounded-lg text-xs bg-muted border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
                                {c}
                              </button>
                            ))}
                          </div>
                          {queriedConcept && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">
                                Relations for <span className="text-primary font-mono">"{queriedConcept}"</span> ({facts.length} found)
                              </p>
                              {facts.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No relations found</p>
                              ) : (
                                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                                  {facts.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                                      <span className="text-primary font-mono text-xs">{queriedConcept}</span>
                                      <span className="text-muted-foreground text-xs">—{f.relation}→</span>
                                      <span className="text-primary font-mono text-xs">{f.target}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Working Memory */}
                      {sys.id === 'working' && (
                        <div className="space-y-3">
                          {prefrontal ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Current State</p>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span className="text-muted-foreground">Goal</span><span className="text-foreground font-medium">{prefrontal.current_goal || '—'}</span></div>
                                  <div className="flex justify-between"><span className="text-muted-foreground">Emotion</span><span className="text-foreground font-medium">{prefrontal.emotion || '—'}</span></div>
                                  <div className="flex justify-between"><span className="text-muted-foreground">Confidence</span><span className="text-foreground font-medium">{((prefrontal.confidence || 0) * 100).toFixed(0)}%</span></div>
                                  <div className="flex justify-between"><span className="text-muted-foreground">Plan Step</span><span className="text-foreground font-medium">{prefrontal.plan_step || 0}</span></div>
                                </div>
                              </div>
                              <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">World Model</p>
                                <pre className="text-xs text-foreground font-mono leading-relaxed overflow-auto max-h-[200px] bg-muted rounded-lg p-2">
                                  {JSON.stringify(prefrontal.world_model || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Prefrontal cortex not active. Start the brain to see working memory.</p>
                          )}
                        </div>
                      )}

                      {/* Motor Memory */}
                      {sys.id === 'motor' && (
                        <div className="space-y-3">
                          {cerebellum ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Cerebellum State</p>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span className="text-muted-foreground">RL Mode</span><span className="text-foreground font-medium">{cerebellum.rl_mode || '—'}</span></div>
                                  <div className="flex justify-between"><span className="text-muted-foreground">Reward</span><span className="text-foreground font-medium">{(cerebellum.sim_reward || 0).toFixed(4)}</span></div>
                                  <div className="flex justify-between"><span className="text-muted-foreground">Sim Step</span><span className="text-foreground font-medium">{cerebellum.sim_step || 0}</span></div>
                                  <div className="flex justify-between"><span className="text-muted-foreground">Fallen</span><span className="text-foreground font-medium">{cerebellum.sim_fallen ? 'Yes' : 'No'}</span></div>
                                </div>
                              </div>
                              <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Joint Actions (7-DoF)</p>
                                <div className="space-y-1.5">
                                  {(cerebellum.last_action || []).map((v, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <span className="text-[0.6rem] text-muted-foreground w-6">J{i}</span>
                                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.abs(v) * 100}%` }} />
                                      </div>
                                      <span className="text-[0.6rem] font-mono text-foreground w-10 text-right">{v.toFixed(2)}</span>
                                    </div>
                                  ))}
                                  {(!cerebellum.last_action || cerebellum.last_action.length === 0) && (
                                    <p className="text-xs text-muted-foreground">No motor actions yet</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Cerebellum not active. Connect the MuJoCo simulator to see motor memory.</p>
                          )}
                        </div>
                      )}

                      {/* Habit Memory */}
                      {sys.id === 'habits' && (
                        <div>
                          {basalGanglia ? (
                            <div className="rounded-xl border border-border p-3">
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Habit Count</span><span className="text-foreground font-medium">{basalGanglia.habit_count || 0} / 100</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Top Habit</span><span className="text-foreground font-medium">{basalGanglia.best_habit || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Top Strength</span><span className="text-foreground font-medium">{(basalGanglia.best_strength || 0).toFixed(3)}</span></div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Basal ganglia not active. Habits form through repeated reinforcement.</p>
                          )}
                        </div>
                      )}

                      {/* Emotional Memory */}
                      {sys.id === 'emotional' && (
                        <div>
                          {amygdala ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="rounded-xl border border-border p-3 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Emotion</p>
                                <p className="text-lg font-bold text-foreground">{amygdala.emotion || '—'}</p>
                              </div>
                              <div className="rounded-xl border border-border p-3 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Valence</p>
                                <p className="text-lg font-bold text-foreground">{(amygdala.valence || 0).toFixed(2)}</p>
                              </div>
                              <div className="rounded-xl border border-border p-3 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Arousal</p>
                                <p className="text-lg font-bold text-foreground">{(amygdala.arousal || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Amygdala not active. Emotional memory requires brain to be running.</p>
                          )}
                        </div>
                      )}

                      {/* Vector Store */}
                      {sys.id === 'vector' && (
                        <div className="rounded-xl border border-border p-4 text-center">
                          <Database className="w-8 h-8 text-primary/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Vector embeddings are stored in MongoDB via the Inventor Studio backend.
                            Used for semantic search when the dream loop queries ArXiv, PubMed, patents, and web content.
                          </p>
                          <a href="/inventor-studio/inventions" className="inline-block mt-3 text-xs text-primary hover:underline">
                            View inventions that use this data →
                          </a>
                        </div>
                      )}

                      {/* Invention Knowledge Graph */}
                      {sys.id === 'invention' && (
                        <div className="rounded-xl border border-border p-4 text-center">
                          <GitBranch className="w-8 h-8 text-primary/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Invention knowledge graph stores concept nodes with embeddings and edges
                            (CONNECTS_TO, INSPIRED_BY, EVOLVED_INTO, SIMILAR_TO). Managed by the Inventor Studio dream loop.
                          </p>
                          <a href="/inventor-studio/inventions" className="inline-block mt-3 text-xs text-primary hover:underline">
                            Browse invention graph →
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Broca output */}
          {broca?.last_utterance && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg grid place-items-center bg-primary/10 border border-primary/20">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Broca's Area — Last Utterance</span>
              </div>
              <p className="text-sm text-muted-foreground italic">"{broca.last_utterance}"</p>
            </div>
          )}

          {/* Danger zone — disabled */}
          <div className="rounded-xl border border-border p-4 opacity-50">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Danger Zone
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Memory reset is disabled. Contact the system administrator to clear Neo4j data.
            </p>
            <div className="flex gap-2">
              <button disabled
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground cursor-not-allowed">
                Reset Memories
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
