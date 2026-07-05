import { useState, useRef, useEffect, useCallback } from 'react'
import { useBrain } from '@/context/BrainContext'
import { AgentCard } from '@/components/AgentCard'

interface AgentCardData {
  name: string
  systemPrompt: string
  role: string
  projectId?: string
  agentId?: string
  preview?: boolean
}

interface ChatMsg {
  role: 'user' | 'brain' | 'system'
  text: string
  ts: number
  agentCard?: AgentCardData
}

function getOrCreateToken(): string {
  const KEY = 'ab_agent_token'
  let token = localStorage.getItem(KEY)
  if (!token || token.length !== 32) {
    const arr = new Uint8Array(16)
    crypto.getRandomValues(arr)
    token = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(KEY, token)
  }
  return token
}

export default function Chat() {
  useBrain() // keep provider active
  const [input, setInput] = useState('')
  const [chatLog, setChatLog] = useState<ChatMsg[]>([])
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const token = useRef(getOrCreateToken())

  // Working directory
  const [workdir, setWorkdir] = useState('')
  const [editingWd, setEditingWd] = useState(false)
  const [wdInput, setWdInput] = useState('')

  // Agent status
  const [agentConnected, setAgentConnected] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)

  // Load chat history on mount
  useEffect(() => {
    fetch('/api/chat/history')
      .then((r) => r.json())
      .then((d) => {
        if (d.messages?.length) {
          setChatLog(d.messages.map((m: { role: string; content: string }) => ({
            role: m.role === 'user' ? 'user' as const : 'brain' as const,
            text: m.content,
            ts: Date.now(),
          })))
        }
      })
      .catch(() => {})
  }, [])

  // Auto-save pending agent after login/signup
  useEffect(() => {
    const pending = localStorage.getItem('brain_pending_agent')
    const authToken = localStorage.getItem('brain_token')
    if (!pending || !authToken) return

    try {
      const agent = JSON.parse(pending)
      if (!agent.name || !agent.systemPrompt) return

      // Save to backend
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ message: `/agent ${agent.name}: ${agent.systemPrompt}`, token: token.current }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.ok && d.createdAgent && !d.createdAgent.preview) {
            localStorage.removeItem('brain_pending_agent')
            setChatLog(prev => [...prev, {
              role: 'brain',
              text: `Your pending agent "${agent.name}" has been saved to your account. Open Genesis to customize it.`,
              ts: Date.now(),
              agentCard: d.createdAgent,
            }])
          }
        })
        .catch(() => {})
    } catch {
      localStorage.removeItem('brain_pending_agent')
    }
  }, [])

  // Load workdir
  useEffect(() => {
    fetch('/api/workdir')
      .then((r) => r.json())
      .then((d) => { if (d.workdir) setWorkdir(d.workdir) })
      .catch(() => {})
  }, [])

  // Poll agent status
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`/api/agent/status?token=${token.current}`)
        const d = await r.json()
        setAgentConnected(d.connected ?? false)
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog])

  const sendMessage = useCallback(async (txt: string) => {
    if (!txt || sending) return
    setChatLog((prev) => [...prev, { role: 'user', text: txt, ts: Date.now() }])
    setSending(true)

    const typingTs = Date.now()
    setChatLog((prev) => [...prev, { role: 'system', text: 'thinking', ts: typingTs }])

    try {
      const authToken = localStorage.getItem('brain_token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`

      const r = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: txt, token: token.current }),
      })
      const d = await r.json()
      setChatLog((prev) => prev.filter((m) => m.ts !== typingTs))
      if (d.ok && d.reply) {
        const msg: ChatMsg = { role: 'brain', text: d.reply, ts: Date.now() }
        if (d.createdAgent) {
          msg.agentCard = d.createdAgent
          // Save pending agent to localStorage so it survives login/signup
          if (d.createdAgent.preview) {
            localStorage.setItem('brain_pending_agent', JSON.stringify(d.createdAgent))
          }
        }
        setChatLog((prev) => [...prev, msg])
      } else {
        setChatLog((prev) => [...prev, { role: 'brain', text: `Error: ${d.error || 'no reply'}`, ts: Date.now() }])
      }
    } catch (e) {
      setChatLog((prev) => prev.filter((m) => m.ts !== typingTs))
      setChatLog((prev) => [...prev, { role: 'brain', text: `Error: ${e}`, ts: Date.now() }])
    } finally {
      setSending(false)
    }
  }, [sending])

  const sendChat = useCallback(() => {
    const txt = input.trim()
    if (!txt) return
    setInput('')
    sendMessage(txt)
  }, [input, sendMessage])

  // Auto-send pending message from Home page prompt
  useEffect(() => {
    const pending = sessionStorage.getItem('ab_pending_msg')
    if (pending) {
      sessionStorage.removeItem('ab_pending_msg')
      setTimeout(() => sendMessage(pending), 500)
    }
  }, [])

  const clearChat = async () => {
    try {
      await fetch('/api/chat/history', { method: 'DELETE' })
      setChatLog([])
    } catch { /* ignore */ }
  }

  const applyWorkdir = async () => {
    const path = wdInput.trim().replace(/\\/g, '/')
    if (!path) return
    try {
      const r = await fetch('/api/workdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const d = await r.json()
      if (d.ok) {
        setWorkdir(d.workdir || path)
        setEditingWd(false)
        setChatLog((prev) => [...prev, { role: 'system', text: `Working directory set to: ${d.workdir || path}`, ts: Date.now() }])
      }
    } catch { /* ignore */ }
  }

  const clearWorkdir = async () => {
    try {
      await fetch('/api/workdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '' }),
      })
      setWorkdir('')
      setChatLog((prev) => [...prev, { role: 'system', text: 'Working directory restriction cleared.', ts: Date.now() }])
    } catch { /* ignore */ }
  }

  const copyToken = () => {
    navigator.clipboard.writeText(token.current)
    setTokenCopied(true)
    setTimeout(() => setTokenCopied(false), 1800)
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 2.5rem)' }}>
      {/* Local Agent Panel + Clear */}
      <div className="rounded-lg bg-card border border-border px-3 py-2 mb-1 shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              agentConnected ? 'bg-emerald-500' : 'bg-muted-foreground/30'
            }`}
          />
          <span className="text-[0.6rem] font-kanit font-bold uppercase tracking-wider text-primary">
            Local Agent
          </span>
          <span className="text-[0.6rem] text-muted-foreground">
            {agentConnected ? 'Connected \u2014 144 tools ready' : 'Not connected \u2014 run npx brain-agent@3.1.0'}
          </span>
          <button
            onClick={clearChat}
            className="ml-auto px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground transition-colors"
          >
            Clear Chat
          </button>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[0.6rem] text-muted-foreground shrink-0">Token:</span>
          <code className="flex-1 bg-muted rounded px-1.5 py-0.5 text-[0.6rem] font-mono text-primary/70 truncate select-all">
            {token.current}
          </code>
          <button
            onClick={copyToken}
            className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground transition-colors shrink-0"
          >
            {tokenCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="bg-muted rounded px-2 py-1 text-[0.6rem] font-mono text-muted-foreground leading-relaxed">
          <div className="text-muted-foreground mb-0.5">To connect the local agent:</div>
          <div className="text-primary/70">npx brain-agent@3.1.0 --url {`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/agent-ws`} --token {token.current}</div>
        </div>
      </div>

      {/* Working directory bar */}
      <div className="rounded bg-card border border-border px-2 py-0.5 mb-1 flex items-center gap-2 text-[0.6rem] shrink-0">
        <span className="text-muted-foreground shrink-0">Working Dir:</span>
        {!editingWd ? (
          <>
            <span className="font-mono text-primary/70 truncate flex-1">
              {workdir || 'unrestricted'}
            </span>
            <button
              onClick={() => { setEditingWd(true); setWdInput(workdir) }}
              className="px-2 py-1 rounded bg-muted border border-border text-muted-foreground hover:bg-accent text-[0.6rem]"
            >
              Set
            </button>
            {workdir && (
              <button
                onClick={clearWorkdir}
                className="px-2 py-1 rounded bg-muted border border-border text-muted-foreground hover:bg-accent text-[0.6rem]"
              >
                Clear
              </button>
            )}
          </>
        ) : (
          <>
            <input
              value={wdInput}
              onChange={(e) => setWdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyWorkdir()}
              placeholder="C:/Users/..."
              className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              autoFocus
            />
            <button
              onClick={applyWorkdir}
              className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-[0.6rem] hover:bg-primary/10"
            >
              Apply
            </button>
            <button
              onClick={() => setEditingWd(false)}
              className="px-2 py-1 rounded bg-muted border border-border text-muted-foreground text-[0.6rem] hover:bg-accent"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg bg-card border border-border px-3 py-2 space-y-1.5">
        {chatLog.length === 0 && (
          <div className="text-center text-muted-foreground py-20 font-poppins text-sm">
            Send a message to start talking with the brain...
          </div>
        )}
        {chatLog.map((msg, i) => {
          if (msg.role === 'system' && msg.text === 'thinking') {
            return (
              <div key={i} className="flex justify-start">
                <div className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/15 flex items-center gap-1.5">
                  <span className="text-primary font-kanit font-bold text-xs animate-spin-slow">{'\u03A8'}</span>
                  <span className="text-[0.6rem] text-muted-foreground">thinking...</span>
                </div>
              </div>
            )
          }
          if (msg.role === 'system') {
            return (
              <div key={i} className="text-center text-[0.6rem] text-muted-foreground py-0.5">
                {msg.text}
              </div>
            )
          }
          if (msg.agentCard) {
            return (
              <div key={i} className="flex justify-start">
                <AgentCard
                  {...msg.agentCard}
                  onRunResult={(output) => {
                    setChatLog((prev) => [...prev, {
                      role: 'brain' as const,
                      text: output,
                      ts: Date.now(),
                    }])
                  }}
                />
              </div>
            )
          }
          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-2.5 py-1.5 rounded-lg text-[0.7rem] leading-snug ${
                  msg.role === 'user'
                    ? 'bg-primary/10 border border-primary/20 text-foreground'
                    : 'bg-primary/10 border border-primary/20 text-foreground'
                }`}
              >
                <span className="text-[0.6rem] font-kanit uppercase tracking-wider text-muted-foreground mr-1.5">
                  {msg.role === 'user' ? 'You' : 'Brain'}
                </span>
                <span className="text-[0.6rem] text-muted-foreground">
                  {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="whitespace-pre-wrap mt-0.5">{msg.text}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-auto pt-1 flex gap-1.5 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendChat()}
          placeholder="e.g. walk forward, look around, remember this..."
          disabled={sending}
          className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-50"
        />
        <button
          onClick={sendChat}
          disabled={sending || !input.trim()}
          className="px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Send {'\u2192'}
        </button>
      </div>

    </div>
  )
}
