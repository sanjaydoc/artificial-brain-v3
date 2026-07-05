import { useState, useEffect, useRef, useCallback } from 'react'
import { useBrain } from '@/context/BrainContext'

const NODES = [
  { id: 'prefrontal', label: 'PREFRONTAL', role: 'planning', color: '#22d3ee', cx: 190, cy: 85, r: 23 },
  { id: 'hippocampus', label: 'HIPPOCAMPUS', role: 'memory', color: '#4ade80', cx: 555, cy: 85, r: 23 },
  { id: 'amygdala', label: 'AMYGDALA', role: 'emotion', color: '#f472b6', cx: 105, cy: 185, r: 21 },
  { id: 'cerebellum', label: 'CEREBELLUM', role: 'RL motor', color: '#f59e0b', cx: 635, cy: 185, r: 21 },
  { id: 'broca', label: 'BROCA', role: 'speech', color: '#a78bfa', cx: 85, cy: 305, r: 21 },
  { id: 'wernicke', label: 'WERNICKE', role: 'listen', color: '#818cf8', cx: 655, cy: 305, r: 21 },
  { id: 'visual_cortex', label: 'VISUAL', role: 'vision', color: '#38bdf8', cx: 188, cy: 415, r: 21 },
  { id: 'temporal_lobe', label: 'TEMPORAL', role: 'neo4j', color: '#34d399', cx: 555, cy: 415, r: 21 },
  { id: 'parietal_lobe', label: 'PARIETAL', role: 'sensors', color: '#fbbf24', cx: 370, cy: 65, r: 21 },
  { id: 'thalamus', label: 'THALAMUS', role: 'router', color: '#f59e0b', cx: 370, cy: 260, r: 28 },
  { id: 'basal_ganglia', label: 'BASAL G.', role: 'habits', color: '#f87171', cx: 238, cy: 320, r: 20 },
  { id: 'insula', label: 'INSULA', role: 'health', color: '#c084fc', cx: 502, cy: 320, r: 20 },
  { id: 'cingulate', label: 'CINGULATE', role: 'conflict', color: '#86efac', cx: 298, cy: 155, r: 20 },
  { id: 'brainstem', label: 'BRAINSTEM', role: 'heartbeat', color: '#94a3b8', cx: 370, cy: 455, r: 21 },
]

const CONNECTIONS = [
  [370, 260, 190, 85], [370, 260, 555, 85], [370, 260, 105, 185], [370, 260, 635, 185],
  [370, 260, 85, 305], [370, 260, 655, 305], [370, 260, 188, 415], [370, 260, 555, 415],
  [370, 260, 370, 65], [370, 260, 238, 320], [370, 260, 502, 320], [370, 260, 298, 155],
  [370, 260, 370, 455],
]

const LOG_COLORS: Record<string, string> = {
  signal: '#f59e0b', heartbeat: '#64748b', reward: '#d97706',
  query: '#a78bfa', response: '#4ade80', world: '#f472b6',
}

interface Pulse {
  id: number
  fromCx: number
  fromCy: number
  toCx: number
  toCy: number
  color: string
  startTime: number
}

export default function NeuralMap() {
  const { nodeStatus, broca, stats, messages, connected, sendText, activeNodeIds } = useBrain()
  const [input, setInput] = useState('')
  const [rlMode, setRlMode] = useState('')
  const [pulses, setPulses] = useState<Pulse[]>([])
  const pulseId = useRef(0)
  const lastMsgCount = useRef(0)
  const svgRef = useRef<SVGSVGElement>(null)

  const isActive = (id: string) => {
    // Check both nodeStatus (from ws heartbeats) and activeNodeIds (from brain_state blob)
    if (activeNodeIds.includes(id)) return true
    const ns = nodeStatus[id]
    return ns && Date.now() - ns.lastSeen < 15000
  }

  // Fire pulse animation when new messages arrive
  useEffect(() => {
    if (messages.length <= lastMsgCount.current) {
      lastMsgCount.current = messages.length
      return
    }
    const newMsgs = messages.slice(lastMsgCount.current)
    lastMsgCount.current = messages.length

    for (const msg of newMsgs) {
      const fromNode = NODES.find((n) => n.id === msg.from)
      const toNode = msg.to ? NODES.find((n) => n.id === msg.to) : NODES.find((n) => n.id === 'thalamus')
      if (fromNode && toNode && fromNode.id !== toNode.id) {
        const newPulse: Pulse = {
          id: pulseId.current++,
          fromCx: fromNode.cx,
          fromCy: fromNode.cy,
          toCx: toNode.cx,
          toCy: toNode.cy,
          color: fromNode.color,
          startTime: Date.now(),
        }
        setPulses((prev) => [...prev.slice(-20), newPulse])
      }

      // Track RL mode from cerebellum signals
      if (msg.from === 'cerebellum' && msg.summary) {
        const rlMatch = msg.summary.match(/rl_mode['":\s]+(\w+)/)
        if (rlMatch) setRlMode(rlMatch[1])
      }
    }
  }, [messages])

  // Clean up old pulses
  useEffect(() => {
    const id = setInterval(() => {
      setPulses((prev) => prev.filter((p) => Date.now() - p.startTime < 1000))
    }, 200)
    return () => clearInterval(id)
  }, [])

  const sendInput = useCallback(() => {
    const txt = input.trim()
    if (!txt) return
    sendText(txt)
    setInput('')
  }, [input, sendText])

  // Health color
  const healthNum = parseInt(stats.health)
  const healthColor = isNaN(healthNum) ? 'text-muted-foreground' : healthNum > 80 ? 'text-emerald-600' : healthNum > 50 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
      {/* Left: SVG brain + utterance + stats */}
      <div>
        <h1 className="text-lg font-kanit font-semibold tracking-wider bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-4">
          Neural Signal Map
        </h1>

        {/* SVG Brain visualization */}
        <div className="rounded-xl bg-card border border-border p-4 overflow-hidden">
          <svg ref={svgRef} viewBox="0 0 740 510" className="w-full max-h-[500px]">
            <defs>
              <filter id="gc">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {/* Connections */}
            {CONNECTIONS.map(([x1, y1, x2, y2], i) => (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(245,158,11,.15)"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            ))}

            {/* Animated pulses */}
            {pulses.map((p) => {
              const elapsed = Date.now() - p.startTime
              const progress = Math.min(1, elapsed / 900)
              const cx = p.fromCx + (p.toCx - p.fromCx) * progress
              const cy = p.fromCy + (p.toCy - p.fromCy) * progress
              const opacity = 1 - progress
              return (
                <circle
                  key={p.id}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={p.color}
                  opacity={opacity}
                  filter="url(#gc)"
                />
              )
            })}

            {/* Nodes */}
            {NODES.map((node) => {
              const active = isActive(node.id)
              return (
                <g key={node.id} className="cursor-pointer">
                  {/* Glow */}
                  {active && (
                    <circle
                      cx={node.cx}
                      cy={node.cy}
                      r={node.r + 6}
                      fill="none"
                      stroke={node.color}
                      strokeWidth="0.5"
                      opacity="0.2"
                      filter="url(#gc)"
                    />
                  )}
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r={node.r}
                    fill={`${node.color}18`}
                    stroke={node.color}
                    strokeWidth={active ? 2 : 1.5}
                    opacity={active ? 1 : 0.5}
                  />
                  {active && (
                    <circle
                      cx={node.cx}
                      cy={node.cy}
                      r={node.r + 4}
                      fill="none"
                      stroke={node.color}
                      strokeWidth="0.5"
                      opacity="0.3"
                    />
                  )}
                  <text
                    x={node.cx}
                    y={node.cy - 3}
                    fontSize="7.5"
                    fill={node.color}
                    textAnchor="middle"
                    fontWeight="700"
                    fontFamily="Kanit, sans-serif"
                  >
                    {node.label}
                  </text>
                  <text
                    x={node.cx}
                    y={node.cy + 8}
                    fontSize="7"
                    fill="rgba(38,38,38,.5)"
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {nodeStatus[node.id]?.status || node.role}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Broca utterance */}
        <div className="mt-3 rounded-xl bg-card border border-border p-4">
          <div className="text-[0.65rem] font-kanit uppercase tracking-widest text-muted-foreground mb-1">
            Broca's Area — Current Utterance
          </div>
          <div className="text-sm text-foreground font-poppins">{broca}</div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { label: 'Signals', value: stats.signals, color: 'text-primary' },
            { label: 'Active Nodes', value: stats.activeNodes, color: 'text-primary' },
            { label: 'Health', value: stats.health, color: healthColor },
            { label: 'Reward', value: stats.reward.toFixed(1), color: stats.reward > 0 ? 'text-emerald-600' : 'text-red-500' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-card border border-border px-3 py-2 text-center">
              <div className={`text-lg font-mono font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Brain input */}
        <div className="mt-3 rounded-xl bg-card border border-border p-4">
          <div className="text-xs font-kanit uppercase tracking-widest text-muted-foreground mb-2">Send Command to Brain</div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendInput()}
              placeholder="e.g. walk forward, look around, remember this..."
              className="flex-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            />
            <button
              onClick={sendInput}
              disabled={!connected || !input.trim()}
              className="px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Send {'\u2192'}
            </button>
          </div>
        </div>
      </div>

      {/* Right: Node status cards + console */}
      <div className="flex flex-col gap-3">
        {/* Node status cards */}
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="text-xs font-kanit uppercase tracking-widest text-muted-foreground mb-3">Node Status</div>
          <div className="grid grid-cols-2 gap-2">
            {NODES.map((node) => {
              const active = isActive(node.id)
              return (
                <div
                  key={node.id}
                  className="rounded-lg bg-muted border px-2.5 py-2 flex items-center gap-2"
                  style={{ borderColor: active ? `${node.color}60` : undefined }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: active ? node.color : '#9ca3af',
                      boxShadow: active ? `0 0 4px ${node.color}` : 'none',
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-[0.65rem] font-kanit font-semibold truncate" style={{ color: node.color }}>
                      {node.label}
                    </div>
                    <div className="text-[0.6rem] font-mono text-muted-foreground truncate">
                      {nodeStatus[node.id]?.status || 'waiting'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* RL Badge */}
          {rlMode && (
            <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 px-3 py-1.5 text-[0.6rem] font-mono text-primary">
              Cerebellum RL: {rlMode}
            </div>
          )}
        </div>

        {/* Signal console */}
        <div className="flex-1 rounded-xl bg-muted border border-border overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-[0.7rem] font-kanit text-muted-foreground">brain:thalamus</span>
            <span className="ml-auto text-[0.6rem] font-mono text-muted-foreground">signal bus</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-[0.6rem] space-y-0.5 max-h-[400px]">
            {messages.slice(-50).map((m, i) => {
              const ts = m.ts ? new Date(Number(m.ts) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
              const fromColor = NODES.find((n) => n.id === m.from)?.color || '#6b7280'
              const toColor = m.to ? (NODES.find((n) => n.id === m.to)?.color || '#6b7280') : '#9ca3af'
              const typeColor = LOG_COLORS[m.type] || '#6b7280'
              return (
                <div key={i} className="text-foreground/50 truncate">
                  {ts && <span className="text-muted-foreground mr-1">{ts}</span>}
                  <span style={{ color: fromColor }}>{m.from || '?'}</span>
                  <span className="text-muted-foreground"> {'\u2192'} </span>
                  {m.to && <span style={{ color: toColor }}>{m.to} </span>}
                  <span style={{ color: typeColor }}>[{m.type || 'signal'}]</span>
                  {m.summary && <span className="text-foreground/40 ml-1">{m.summary.slice(0, 55)}</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
