import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Send, Trash2, Zap, Loader } from 'lucide-react'
import { chatApi, autonomousApi } from '@/lib/api'
import { AppHeader } from '@/components/AppHeader'

function EmotionPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-7 h-1 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(value * 100).toFixed(0)}%`, background: color }} />
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  )
}

function MessageBubble({ msg, onInventionClick }: { msg: any; onInventionClick?: (id: string) => void }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2.5 mb-5`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Brain className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'rounded-[16px_4px_16px_16px] bg-primary/10 border border-primary/20 text-foreground'
            : 'rounded-[4px_16px_16px_16px] bg-muted border border-border text-foreground'
        }`}>
          {msg.content}
        </div>
        {(msg.triggered_queue_id || msg.triggeredInventionId) && (
          <button
            onClick={() => onInventionClick && onInventionClick(msg.triggered_queue_id || msg.triggeredInventionId)}
            className="mt-1.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-[11px] text-primary font-semibold">Invention queued</span>
          </button>
        )}
        <span className="text-[10px] text-muted-foreground mt-1">
          {new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-lg shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
          Y
        </div>
      )}
    </div>
  )
}

export default function Chat() {
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const [messages, setMessages]   = useState<any[]>([])
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [consciousness, setConsciousness] = useState<any>(null)

  const loadHistory = useCallback(async () => {
    try {
      const msgs = await chatApi.history()
      setMessages(msgs || [])
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  const loadConsciousness = useCallback(async () => {
    try {
      const { state } = await autonomousApi.consciousness()
      setConsciousness(state || null)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    loadHistory()
    loadConsciousness()
  }, [loadHistory, loadConsciousness])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    const tempUser = { id: 'temp-user', role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, tempUser])

    try {
      const data = await chatApi.send(text)
      const assistantMsg = {
        id: 'temp-assistant',
        role: 'assistant',
        content: data.reply,
        triggered_queue_id: data.queued?.id ?? null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev.filter(m => m.id !== 'temp-user'), assistantMsg])
      setTimeout(loadHistory, 200)
      loadConsciousness()
    } catch {
      setMessages(prev => prev.filter(m => m.id !== 'temp-user'))
      setMessages(prev => [...prev, {
        id: 'err', role: 'assistant',
        content: 'Sorry, I could not respond right now. Please try again.',
        created_at: new Date().toISOString(),
      }])
    }
    setSending(false)
  }

  const clearHistory = async () => {
    if (!window.confirm('Clear all chat history?')) return
    await chatApi.clear()
    setMessages([])
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const dominant = consciousness ? [
    { name: 'curious',    value: consciousness.curiosity    },
    { name: 'satisfied',  value: consciousness.satisfaction },
    { name: 'excited',    value: consciousness.excitement   },
    { name: 'frustrated', value: consciousness.frustration  },
  ].sort((a, b) => b.value - a.value)[0] : null

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />

      {/* Sub-header with consciousness info */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Brain className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">Inventor Studio ASI</p>
              {dominant && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  feeling {dominant.name} · {(dominant.value * 100).toFixed(0)}%
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {consciousness && (
              <div className="hidden sm:flex gap-3 items-center">
                <EmotionPill label="curious"   value={consciousness.curiosity}    color="#3b82f6" />
                <EmotionPill label="satisfied" value={consciousness.satisfaction} color="#16a34a" />
                <EmotionPill label="excited"   value={consciousness.excitement}   color="#eab308" />
              </div>
            )}
            <button onClick={clearHistory}
              className="p-2 rounded-lg border border-destructive/20 hover:bg-destructive/10 transition-colors" title="Clear history">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <span className="loader" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 animate-fadeIn">
              <div className="w-16 h-16 rounded-xl mx-auto mb-5 bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Speak with Inventor Studio ASI
              </h2>
              {consciousness?.lastMonologue && (
                <p className="text-sm text-muted-foreground italic max-w-md mx-auto mb-5">
                  "{consciousness.lastMonologue.slice(0, 160)}{consciousness.lastMonologue.length > 160 ? '...' : ''}"
                </p>
              )}
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
                Ask me about ideas, inventions, science, or say <em className="text-primary">"invent X"</em> to add a concept to my dream queue.
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                {[
                  'What are you currently working on?',
                  'Invent a new way to filter ocean microplastics',
                  'How do you feel right now?',
                  'What was your most novel invention?',
                ].map(suggestion => (
                  <button key={suggestion} onClick={() => setInput(suggestion)}
                    className="px-3.5 py-2 rounded-xl text-xs bg-muted border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all font-medium">
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg: any) => (
              <MessageBubble key={msg.id} msg={msg} onInventionClick={() => navigate('/inventions')} />
            ))
          )}

          {sending && (
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div className="px-4 py-3 rounded-[4px_16px_16px_16px] bg-muted border border-border flex items-center gap-2">
                <Loader className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">thinking...</span>
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
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask something, or say 'invent X' to queue an invention..."
              rows={1}
              className="input-field flex-1 resize-none min-h-[44px] max-h-[140px] overflow-y-auto"
            />
            <button onClick={sendMessage} disabled={sending || !input.trim()}
              className="btn-primary w-11 h-11 p-0 shrink-0 disabled:opacity-30">
              <Send className="w-[17px] h-[17px]" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
