import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Trash2,
  Search,
  X,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AppHeader } from '@/components/AppHeader'
import { growthApi, type GrowthListItem, type GrowthStatus } from '@/lib/api'

const STATUS_CHIP: Record<
  GrowthStatus,
  { label: string; cls: string }
> = {
  queued: { label: 'Queued', cls: 'text-primary bg-primary/10 border-primary/20' },
  gathering: { label: 'Gathering', cls: 'text-primary bg-primary/10 border-primary/20' },
  reasoning: { label: 'Reasoning', cls: 'text-primary bg-primary/10 border-primary/20' },
  synthesizing: { label: 'Synthesizing', cls: 'text-primary bg-primary/10 border-primary/20' },
  critiquing: { label: 'Critiquing', cls: 'text-primary bg-primary/10 border-primary/20' },
  planning: { label: 'Planning', cls: 'text-primary bg-primary/10 border-primary/20' },
  complete: { label: 'Complete', cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  error: { label: 'Failed', cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Reports() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<GrowthListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    growthApi
      .list()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this growth report? This cannot be undone.')) return
    setDeleting(id)
    try {
      await growthApi.remove(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      console.error('delete failed', err)
    } finally {
      setDeleting(null)
    }
  }

  const filtered = query.trim()
    ? items.filter((i) => i.concept.toLowerCase().includes(query.trim().toLowerCase()))
    : items

  if (!user) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="flex items-baseline justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Your growth reports
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} total
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by concept…"
            className="w-full rounded-lg border border-border bg-input pl-10 pr-9 py-2 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground text-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-3 p-0.5 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-muted px-4 py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
            Loading reports…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center">
            {items.length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  No growth reports yet. Run your first analysis.
                </p>
                <Link
                  to="/growth"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors"
                >
                  <Sparkles className="h-4 w-4" /> Run your first analysis
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No reports match your search.</p>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => {
              const chip = STATUS_CHIP[item.status]
              return (
                <li key={item.id}>
                  <button
                    onClick={() => navigate(`/growth/${item.id}`)}
                    className="group w-full text-left rounded-xl border border-border bg-card hover:border-primary/20 hover:bg-accent px-3 sm:px-4 py-3 sm:py-4 flex items-start sm:items-center gap-2 sm:gap-4 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium line-clamp-2">{item.concept}</p>
                      <div className="mt-1.5 sm:mt-2 flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                        <span>{timeAgo(item.createdAt)}</span>
                        {item.totalElapsedMs > 0 && (
                          <span>· {(item.totalElapsedMs / 1000).toFixed(0)}s run</span>
                        )}
                        <span
                          className={`sm:hidden inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${chip.cls}`}
                        >
                          {chip.label}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${chip.cls}`}
                    >
                      {item.status === 'complete' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : item.status === 'error' ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      {chip.label}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      disabled={deleting === item.id}
                      className="p-1.5 sm:p-2 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                      title="Delete"
                      aria-label="Delete report"
                    >
                      {deleting === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                    <ChevronRight className="hidden sm:block h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
