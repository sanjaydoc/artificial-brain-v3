import { useState, useEffect } from 'react'

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

export default function Memory() {
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [stats, setStats] = useState<Record<string, { short: number; long: number }>>({})
  const [concept, setConcept] = useState('')
  const [facts, setFacts] = useState<Fact[]>([])
  const [queriedConcept, setQueriedConcept] = useState('')
  const [filterNode, setFilterNode] = useState('')
  const [filterTerm, setFilterTerm] = useState('')

  async function loadMemories() {
    const params = new URLSearchParams()
    if (filterNode) params.set('node', filterNode)
    if (filterTerm) params.set('term', filterTerm)
    params.set('limit', '50')
    try {
      const r = await fetch(`/api/brain/memory?${params}`)
      const data = await r.json()
      if (data.ok) setMemories(data.memories || [])
    } catch {}
  }

  async function loadStats() {
    try {
      const r = await fetch('/api/brain/memory/stats')
      const data = await r.json()
      if (data.ok) setStats(data.stats || {})
    } catch {}
  }

  async function queryKnowledge() {
    if (!concept.trim()) return
    try {
      const r = await fetch(`/api/brain/knowledge/${encodeURIComponent(concept.trim())}`)
      const data = await r.json()
      if (data.ok) {
        setFacts(data.facts || [])
        setQueriedConcept(concept.trim())
      }
    } catch {}
  }

  useEffect(() => { loadMemories(); loadStats() }, [filterNode, filterTerm])

  const NODES = [
    'prefrontal', 'hippocampus', 'amygdala', 'cerebellum', 'broca',
    'wernicke', 'visual_cortex', 'temporal_lobe', 'parietal_lobe',
    'basal_ganglia', 'insula', 'cingulate',
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-kanit font-semibold text-primary">Memory & Knowledge Graph</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Object.entries(stats).map(([node, counts]) => (
          <div key={node} className="bg-card border border-border rounded-lg p-2">
            <div className="text-[0.6rem] text-muted-foreground truncate">{node}</div>
            <div className="flex gap-2 text-[0.65rem] mt-0.5">
              <span className="text-primary">S: {counts.short}</span>
              <span className="text-primary">L: {counts.long}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Episodic Memories */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-kanit font-semibold text-primary">Episodic Memories</h2>
            <button onClick={loadMemories} className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground transition-colors">
              Refresh
            </button>
          </div>

          <div className="flex gap-1 mb-2">
            <select value={filterNode} onChange={(e) => setFilterNode(e.target.value)}
              className="bg-muted border border-border rounded px-1.5 py-0.5 text-[0.6rem] text-foreground">
              <option value="">All Nodes</option>
              {NODES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}
              className="bg-muted border border-border rounded px-1.5 py-0.5 text-[0.6rem] text-foreground">
              <option value="">All Terms</option>
              <option value="short">Short-term</option>
              <option value="long">Long-term</option>
            </select>
          </div>

          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {memories.length === 0 && (
              <div className="text-[0.65rem] text-neutral-500 py-4 text-center">No memories found</div>
            )}
            {memories.map((m, i) => (
              <div key={i} className="bg-muted border border-border rounded p-1.5">
                <div className="flex items-center gap-1.5 text-[0.6rem]">
                  <span className="text-primary font-mono">{m.node}</span>
                  <span className="text-muted-foreground">{m.type}</span>
                  <span className={`ml-auto px-1 rounded text-[0.6rem] ${m.term === 'long' ? 'bg-primary/20 text-primary' : 'bg-primary/20 text-primary'}`}>
                    {m.term}
                  </span>
                  <span className="text-muted-foreground text-[0.6rem]">{m.importance?.toFixed(2)}</span>
                </div>
                <div className="text-[0.6rem] text-foreground mt-0.5 break-all line-clamp-2">
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge Graph */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-kanit font-semibold text-primary mb-2">Knowledge Graph</h2>

          <div className="flex gap-1 mb-3">
            <input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && queryKnowledge()}
              placeholder="Search concept..."
              className="flex-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            />
            <button onClick={queryKnowledge} className="px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors">
              Query
            </button>
          </div>

          {queriedConcept && (
            <div className="mb-2">
              <div className="text-[0.65rem] text-muted-foreground mb-1">
                Results for <span className="text-primary font-mono">"{queriedConcept}"</span>:
              </div>
              {facts.length === 0 ? (
                <div className="text-[0.6rem] text-neutral-500">No relations found</div>
              ) : (
                <div className="space-y-1">
                  {facts.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[0.65rem] bg-muted border border-border rounded px-2 py-1">
                      <span className="text-primary font-mono">{queriedConcept}</span>
                      <span className="text-muted-foreground">—{f.relation}→</span>
                      <span className="text-primary font-mono">{f.target}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-border">
            <div className="text-[0.6rem] text-muted-foreground mb-1">Quick concepts to explore:</div>
            <div className="flex flex-wrap gap-1">
              {['walk', 'environment', 'visual_input', 'balance', 'reward'].map((c) => (
                <button
                  key={c}
                  onClick={() => { setConcept(c); setTimeout(queryKnowledge, 100) }}
                  className="px-1.5 py-0.5 text-[0.6rem] border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/20"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
