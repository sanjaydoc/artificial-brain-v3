import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Send, Trash2, Loader, TrendingUp } from 'lucide-react'
import { AppHeader } from '@/components/AppHeader'
import { chatApi, type ChatMessageDoc } from '@/lib/api'

type LocalMsg = ChatMessageDoc & { pending?: boolean }

const SUGGESTIONS = [
  'How can I grow my customer base this quarter?',
  'What channels should I prioritise for B2B SaaS?',
  '/growth Increase paid sign-ups for my e-commerce store',
  'Where am I overspending right now?',
]

function MessageBubble({ msg }: { msg: LocalMsg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2.5 mb-4`}>
      {/* Avatar */}
      {!isUser ? (
        <div className="h-8 w-8 rounded-lg shrink-0 bg-primary/15 border border-primary/30 grid place-items-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      ) : (
        <div className="h-8 w-8 rounded-lg shrink-0 bg-primary grid place-items-center text-white font-black text-xs">
          Y
        </div>
      )}

      <div
        className={`max-w-[75%] flex flex-col ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words border ${
            isUser
              ? 'rounded-[16px_4px_16px_16px] bg-primary/10 border-primary/30 text-foreground'
              : 'rounded-[4px_16px_16px_16px] bg-muted border-border text-foreground'
          }`}
        >
          {msg.content}
        </div>

        {/* Queued growth badge */}
        {msg.triggeredGrowthId && (
          <Link
            to={`/growth/${msg.triggeredGrowthId}`}
            className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <TrendingUp className="h-3 w-3" />
            Growth analysis queued
          </Link>
        )}

        <span className="mt-1 text-[10px] text-muted-foreground">
          {new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

export default function Chat() {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<LocalMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadHistory = useCallback(async () => {
    try {
      const items = await chatApi.history()
      setMessages(items)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    const tempUser: LocalMsg = {
      id: 'temp-user',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      pending: true,
    }
    setMessages((prev) => [...prev, tempUser])

    try {
      const data = await chatApi.send(text)
      const assistantMsg: LocalMsg = {
        id: 'temp-assistant',
        role: 'assistant',
        content: data.reply,
        triggeredGrowthId: data.queued?.id ?? null,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev.filter((m) => m.id !== 'temp-user'), assistantMsg])
      // Reload history to get server-assigned IDs
      setTimeout(() => {
        loadHistory()
      }, 300)
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'temp-user'),
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: 'Sorry — I couldn’t respond right now. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const clearHistory = async () => {
    if (!window.confirm('Clear all chat history? This cannot be undone.')) return
    try {
      await chatApi.clear()
      setMessages([])
    } catch {
      /* silent */
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />

      {/* Sub-header — chat identity */}
      <div className="border-b border-border bg-card/60">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">Sentiance ASI</p>
              <p className="text-[10px] text-muted-foreground">10-agent reasoning · live</p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors px-2 py-1 rounded-md border border-border hover:border-red-400/30"
              title="Clear history"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader className="h-5 w-5 text-primary animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 md:py-20">
              <div className="h-16 w-16 rounded-xl bg-primary/10 border border-primary/20 mx-auto mb-5 grid place-items-center">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Talk strategy with Sentiance
              </h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Ask anything about growing your business. Say{' '}
                <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  /growth &lt;your goal&gt;
                </code>{' '}
                to kick off a 10-agent analysis with a downloadable PDF report.
              </p>

              <div className="mt-8 flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-3.5 py-1.5 rounded-full text-xs text-muted-foreground bg-muted border border-border hover:border-primary/40 hover:text-primary hover:bg-primary/[0.05] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} msg={m} />)
          )}

          {sending && (
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-lg shrink-0 bg-primary/15 border border-primary/30 grid place-items-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="px-4 py-2.5 rounded-[4px_16px_16px_16px] bg-muted border border-border flex items-center gap-2">
                <Loader className="h-3.5 w-3.5 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">thinking…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input bar */}
      <div className="border-t border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask, or type /growth <goal> to kick off a full analysis…"
              rows={1}
              className="flex-1 resize-none overflow-y-auto min-h-[44px] max-h-36 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className={`h-11 w-11 shrink-0 rounded-lg grid place-items-center transition-all ${
                input.trim() && !sending
                  ? 'bg-primary text-white hover:bg-primary/90 shadow-[0_8px_30px_rgba(59,130,246,0.25)]'
                  : 'bg-muted border border-border text-muted-foreground cursor-not-allowed'
              }`}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
