import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'

export interface SignalEntry {
  from: string
  to?: string
  type: string
  ts?: number
  summary?: string
}

interface BrainState {
  connected: boolean
  messages: SignalEntry[]
  nodeStatus: Record<string, { status: string; lastSeen: number }>
  broca: string
  stats: { signals: number; activeNodes: number; health: string; reward: number }
  activeNodeIds: string[]
  agentConnected: boolean
  send: (msg: Record<string, unknown>) => void
  sendText: (text: string) => void
}

const BrainContext = createContext<BrainState | null>(null)

export function useBrain() {
  const ctx = useContext(BrainContext)
  if (!ctx) throw new Error('useBrain must be used within BrainProvider')
  return ctx
}

const MAX_LOG = 200

export function BrainProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const [connected, setConnected] = useState(false)
  const [agentConnected, setAgentConnected] = useState(false)
  const [messages, setMessages] = useState<SignalEntry[]>([])
  const [nodeStatus, setNodeStatus] = useState<Record<string, { status: string; lastSeen: number }>>({})
  const [broca, setBroca] = useState('Initializing neural pathways...')
  const [stats, setStats] = useState({ signals: 0, activeNodes: 0, health: '--', reward: 0 })
  const [activeNodeIds, setActiveNodeIds] = useState<string[]>([])
  const lastMsgCount = useRef(0)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${location.host}/ws`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      reconnectTimer.current = setTimeout(connect, 3000)
    }
    ws.onerror = () => ws.close()

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)

        // Agent connection status
        if (data.type === 'agent_status') {
          setAgentConnected(!!data.connected)
          return
        }

        // Brain state blob: {signal_log, active_nodes, message_count, ts, ...node states}
        if (data.type === 'brain_state' || data.signal_log !== undefined) {
          const signalLog = (data.signal_log || []) as SignalEntry[]
          const activeNodes = (data.active_nodes || []) as string[]
          const msgCount = data.message_count ?? 0
          if (data.agent_connected !== undefined) setAgentConnected(data.agent_connected)

          setActiveNodeIds(activeNodes)
          const now = Date.now()
          setNodeStatus((prev) => {
            const next = { ...prev }
            for (const nodeId of activeNodes) next[nodeId] = { status: 'active', lastSeen: now }
            return next
          })

          if (msgCount > lastMsgCount.current && signalLog.length > 0) {
            const newCount = msgCount - lastMsgCount.current
            const newEntries = signalLog.slice(-Math.min(newCount, signalLog.length))
            if (newEntries.length > 0) {
              setMessages((prev) => [...prev.slice(-(MAX_LOG - newEntries.length)), ...newEntries])
              for (const entry of newEntries) {
                if (entry.from === 'broca' && entry.summary) {
                  const txt = entry.summary.replace(/^['"{]|['"}\]]+$/g, '').trim()
                  if (txt && txt.length > 5) setBroca(txt)
                }
              }
            }
            lastMsgCount.current = msgCount
          } else if (lastMsgCount.current === 0 && signalLog.length > 0) {
            setMessages(signalLog.slice(-MAX_LOG))
            lastMsgCount.current = msgCount
          }

          setStats((prev) => ({ ...prev, signals: msgCount, activeNodes: activeNodes.length }))
          return
        }

        if (data.type === 'health_report' && data.data) {
          const d = data.data as Record<string, unknown>
          setStats((prev) => ({
            ...prev,
            activeNodes: typeof d.active_nodes === 'number' ? d.active_nodes : prev.activeNodes,
            health: typeof d.overall === 'string' ? d.overall : prev.health,
          }))
          return
        }

        if (data.type === 'rl_step' && data.data) {
          const d = data.data as Record<string, unknown>
          setStats((prev) => ({ ...prev, reward: typeof d.reward === 'number' ? d.reward : prev.reward }))
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    connect()
    return () => { clearTimeout(reconnectTimer.current); wsRef.current?.close() }
  }, [connect])

  // HTTP fallback polling
  useEffect(() => {
    if (connected) return
    const poll = async () => {
      try {
        const r = await fetch('/api/brain/state')
        const data = await r.json()
        if (data.thalamus?.signal_log) {
          const sl = data.thalamus.signal_log as SignalEntry[]
          const an = data.thalamus.active_nodes || []
          const mc = data.thalamus.message_count ?? 0
          setActiveNodeIds(an)
          if (mc > lastMsgCount.current) {
            setMessages(sl.slice(-MAX_LOG))
            lastMsgCount.current = mc
          }
          setStats((prev) => ({ ...prev, signals: mc, activeNodes: an.length }))
        }
      } catch {}
    }
    const id = setInterval(poll, 3500)
    return () => clearInterval(id)
  }, [connected])

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg))
  }, [])

  const sendText = useCallback((text: string) => send({ type: 'user_input', content: text }), [send])

  return (
    <BrainContext.Provider value={{ connected, messages, nodeStatus, broca, stats, activeNodeIds, agentConnected, send, sendText }}>
      {children}
    </BrainContext.Provider>
  )
}
