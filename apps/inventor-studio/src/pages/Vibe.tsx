import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Code2, Send, Trash2, Loader, Copy, Check, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'
import { AppHeader } from '@/components/AppHeader'

const MODE_NAMES: Record<number, string> = { 1: 'coding', 2: 'scaffold', 3: 'inventor', 4: 'vibe' }
const vibeSend = (message: string, mode: number, inventionId?: string) =>
  api.post('/vibe', { message, mode: MODE_NAMES[mode] || 'build', inventionId }, { timeout: 180000 })
const vibeHistory = () => api.get('/vibe/history')
const vibeClearHistory = () => api.delete('/vibe/history')
// /vibe/limits not implemented — hardcoded fallback used instead
const vibeGetInventions = () => api.get('/inventions')

interface VibeMode {
  id: number
  label: string
  sub: string
  color: string
  suggestions: string[]
}

const MODES: VibeMode[] = [
  {
    id: 1, label: 'Coding Assistant', sub: 'Freeform chat — write, debug, explain code',
    color: '#3b82f6',
    suggestions: ['Write a REST API in Node.js with Express', 'Debug this Python async function', 'Explain how WebSockets work with code', 'Write a binary search implementation'],
  },
  {
    id: 2, label: 'Project Scaffolder', sub: 'Describe an app — get full file structure + code',
    color: '#16a34a',
    suggestions: ['Scaffold a React + Vite todo app with Tailwind', 'Create a FastAPI backend with PostgreSQL', 'Build a CLI tool in Python with argparse', 'Set up a Next.js app with authentication'],
  },
  {
    id: 3, label: 'Inventor to Code', sub: 'Take an invention and code it up',
    color: '#2563eb',
    suggestions: ['Implement the core algorithm of this invention', 'Build a prototype simulation', 'Create a data pipeline for this system', 'Write the sensor interface layer'],
  },
  {
    id: 4, label: 'Vibe Coding Session', sub: 'Build iteratively — turn by turn, artifact by artifact',
    color: '#7c3aed',
    suggestions: ["Let's build a real-time chat app from scratch", 'I want to create a personal finance tracker', 'Help me vibe code a markdown editor', "Let's build an AI-powered search UI"],
  },
]

function CopyButton({ text, small = false }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button onClick={copy} title="Copy"
      className={`flex items-center gap-1 rounded-md border border-border bg-muted hover:bg-accent transition-colors shrink-0 ${
        small ? 'px-1.5 py-0.5' : 'px-2.5 py-1'
      } ${copied ? 'text-green-600' : 'text-muted-foreground'}`}
      style={{ fontSize: 11 }}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {!small && (copied ? 'Copied' : 'Copy')}
    </button>
  )
}

function renderContent(text: string): Array<{ type: 'text' | 'code'; content: string; lang?: string }> {
  const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = []
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0
  let match
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', content: text.slice(last, match.index) })
    parts.push({ type: 'code', lang: match[1] || 'code', content: match[2].trim() })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) })
  return parts
}

function MessageBubble({ msg }: { msg: any }) {
  const isUser = msg.role === 'user'
  const parts = renderContent(msg.content)

  return (
    <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2.5 mb-5`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Code2 className="w-4 h-4 text-primary" />
        </div>
      )}

      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1.5`}>
        {parts.map((part, i) => part.type === 'text' ? (
          part.content.trim() ? (
            <div key={i} className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
              isUser
                ? 'rounded-[14px_4px_14px_14px] bg-primary/10 border border-primary/20 text-foreground'
                : 'rounded-[4px_14px_14px_14px] bg-muted border border-border text-foreground'
            }`}>
              {part.content.trim()}
            </div>
          ) : null
        ) : (
          <div key={i} className="w-full rounded-xl overflow-hidden border border-border bg-muted">
            <div className="flex items-center justify-between px-3 py-1.5 bg-secondary border-b border-border">
              <span className="text-[11px] text-muted-foreground font-mono">{part.lang || 'code'}</span>
              <CopyButton text={part.content} small />
            </div>
            <pre className="m-0 p-4 font-mono text-xs leading-relaxed text-foreground overflow-x-auto whitespace-pre">
              {part.content}
            </pre>
          </div>
        ))}

        {!isUser && msg.content.length > 80 && <CopyButton text={msg.content} />}

        <div className="flex items-center gap-2">
          {msg.mode && (
            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
              Mode {msg.mode}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
          Y
        </div>
      )}
    </div>
  )
}

export default function Vibe() {
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [mode, setMode] = useState(1)
  const [modeOpen, setModeOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [limits, setLimits] = useState<any>(null)
  const [inventions, setInventions] = useState<any[]>([])
  const [selectedInv, setSelectedInv] = useState('')
  const [invOpen, setInvOpen] = useState(false)

  const currentMode = MODES.find(m => m.id === mode) || MODES[0]

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await vibeHistory()
      setMessages(data.messages || [])
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadHistory()
    vibeGetInventions().then(({ data }: any) => setInventions(data.inventions || [])).catch(() => {})
  }, [loadHistory])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    const tempUser = { id: 'temp-user', role: 'user', content: text, mode, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, tempUser])

    try {
      const { data } = await vibeSend(text, mode, selectedInv || undefined)
      const assistantMsg = { id: 'temp-assistant', role: 'assistant', content: data.reply, mode: data.mode, created_at: new Date().toISOString() }
      setMessages(prev => [...prev.filter(m => m.id !== 'temp-user'), assistantMsg])
      setTimeout(loadHistory, 200)
    } catch {
      setMessages(prev => prev.filter(m => m.id !== 'temp-user'))
      setMessages(prev => [...prev, {
        id: 'err', role: 'assistant', mode,
        content: 'Vibe Coding is not available right now. The LLM may be unreachable. Try again.',
        created_at: new Date().toISOString(),
      }])
    }
    setSending(false)
  }

  const clearHistory = async () => {
    if (!window.confirm('Clear all vibe history?')) return
    await vibeClearHistory()
    setMessages([])
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const tokenLimit = limits ? limits[`mode_${mode}_limit`] : [2000, 6000, 2000, 4000][mode - 1]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />

      {/* Sub-header — mode selector + controls */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Code2 className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">Vibe Coding</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">ASI-1 · {tokenLimit} tokens</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode selector dropdown */}
            <div className="relative">
              <button onClick={() => setModeOpen(o => !o)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  modeOpen ? 'border-primary/40 bg-primary/10' : 'border-border bg-card hover:border-primary/20'
                }`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: currentMode.color }} />
                <span className="text-foreground max-w-[140px] truncate">{currentMode.label}</span>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${modeOpen ? 'rotate-180' : ''}`} />
              </button>

              {modeOpen && (
                <div className="absolute top-[calc(100%+4px)] right-0 bg-card border border-border rounded-xl overflow-hidden z-50 min-w-[280px] shadow-lg">
                  {MODES.map(m => (
                    <button key={m.id} onClick={() => { setMode(m.id); setModeOpen(false) }}
                      className={`w-full px-4 py-3 text-left border-b border-border flex items-start gap-3 hover:bg-accent transition-colors ${
                        mode === m.id ? 'bg-accent' : ''
                      }`}>
                      <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: m.color }} />
                      <div>
                        <p className={`text-sm font-semibold ${mode === m.id ? 'text-primary' : 'text-foreground'}`}>{m.label}</p>
                        <p className="text-[11px] text-muted-foreground">{m.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={clearHistory}
              className="p-2 rounded-lg border border-destructive/20 hover:bg-destructive/10 transition-colors" title="Clear history">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        </div>
      </div>

      {/* Invention selector for mode 3 */}
      {mode === 3 && (
        <div className="border-b border-border bg-accent/50">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-2.5 flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-semibold shrink-0">Invention:</span>
            <div className="relative flex-1">
              <button onClick={() => setInvOpen(o => !o)}
                className="w-full px-3 py-2 rounded-lg text-left bg-card border border-border flex items-center justify-between text-sm hover:border-primary/20 transition-colors">
                <span className="truncate text-muted-foreground">
                  {selectedInv
                    ? (inventions.find(i => i.id === selectedInv)?.seed_concept || inventions.find(i => i.id === selectedInv)?.seedConcept)?.slice(0, 60) || 'Selected'
                    : 'No invention selected — describe your project directly'}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 ml-2" />
              </button>
              {invOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-card border border-border rounded-xl overflow-hidden z-50 max-h-[220px] overflow-y-auto shadow-lg">
                  <button onClick={() => { setSelectedInv(''); setInvOpen(false) }}
                    className="w-full px-4 py-2.5 text-left border-b border-border text-xs text-muted-foreground hover:bg-accent transition-colors">
                    None — describe directly
                  </button>
                  {inventions.length === 0 ? (
                    <p className="px-4 py-2.5 text-xs text-muted-foreground">No completed inventions yet</p>
                  ) : inventions.map(inv => (
                    <button key={inv.id} onClick={() => { setSelectedInv(inv.id); setInvOpen(false) }}
                      className={`w-full px-4 py-2.5 text-left border-b border-border flex flex-col gap-0.5 hover:bg-accent transition-colors ${
                        selectedInv === inv.id ? 'bg-accent' : ''
                      }`}>
                      <span className="text-xs text-foreground truncate">{(inv.seed_concept || inv.seedConcept)?.slice(0, 80)}</span>
                      <span className="text-[10px] text-muted-foreground">{inv.domain} · {new Date(inv.created_at || inv.createdAt).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <span className="loader" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 animate-fadeIn">
              <div className="w-[72px] h-[72px] rounded-xl mx-auto mb-5 bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Code2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1.5">{currentMode.label}</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-7 leading-relaxed">
                {currentMode.sub}
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                {currentMode.suggestions.map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="px-3.5 py-2 rounded-xl text-xs bg-muted border border-border text-primary font-medium hover:border-primary/30 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
          )}

          {sending && (
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary" />
              </div>
              <div className="px-4 py-3 rounded-[4px_14px_14px_14px] bg-muted border border-border flex items-center gap-2">
                <Loader className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">ASI-1 is thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input bar */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-3.5">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                mode === 1 ? 'Ask ASI-1 to write, debug, or explain code...' :
                mode === 2 ? 'Describe the app you want to scaffold...' :
                mode === 3 ? 'Describe what to implement from this invention...' :
                             'What do you want to build? Start the vibe session...'
              }
              rows={1}
              className="input-field flex-1 resize-none min-h-[44px] max-h-[160px] overflow-y-auto"
            />
            <button onClick={sendMessage} disabled={sending || !input.trim()}
              className="btn-primary w-11 h-11 p-0 shrink-0 disabled:opacity-30">
              <Send className="w-[17px] h-[17px]" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            Enter to send · Shift+Enter for new line · Mode: {currentMode.label}
          </p>
        </div>
      </div>
    </div>
  )
}
