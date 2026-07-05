import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, ChevronRight, Zap, Clock, Search, X, Share2 } from 'lucide-react'
import { api } from '@/lib/api'
import ShareSheet from '@/components/ShareSheet'
import { AppHeader } from '@/components/AppHeader'

const getInventions = () => api.get('/inventions')
const deleteInvention = (id: string) => api.delete(`/inventions/${id}`)

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  complete:     { label: 'Complete',     cls: 'chip-green' },
  dreaming:     { label: 'Dreaming',     cls: 'chip-cyan'  },
  searching:    { label: 'Searching',    cls: 'chip-cyan'  },
  synthesizing: { label: 'Synthesizing', cls: 'chip-gold'  },
  critiquing:   { label: 'Critiquing',   cls: 'chip-gold'  },
  pending:      { label: 'Pending',      cls: 'chip-gray'  },
  failed:       { label: 'Failed',       cls: 'chip-red'   },
}

export default function Inventions() {
  const navigate = useNavigate()
  const [inventions, setInventions]       = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [deleting, setDeleting]           = useState<string | null>(null)
  const [query, setQuery]                 = useState('')
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [searching, setSearching]         = useState(false)
  const [sharingInv, setSharingInv]       = useState<any>(null)

  useEffect(() => {
    getInventions()
      .then(({ data }) => setInventions(data.inventions || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults(null); return }
    setSearching(true)
    const lc = q.trim().toLowerCase()
    const filtered = inventions.filter(inv =>
      (inv.title || inv.seedConcept || '').toLowerCase().includes(lc) ||
      (inv.domain || '').toLowerCase().includes(lc)
    )
    setSearchResults(filtered)
    setSearching(false)
  }, [inventions])

  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return }
    const t = setTimeout(() => handleSearch(query), 500)
    return () => clearTimeout(t)
  }, [query, handleSearch])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeleting(id)
    try {
      await deleteInvention(id)
      setInventions(prev => prev.filter(i => i.id !== id))
    } catch {} finally { setDeleting(null) }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const displayed = searchResults !== null ? searchResults : inventions

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fadeIn">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Inventions</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">My Inventions</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              {searchResults !== null ? `${searchResults.length} results` : `${inventions.length} total`}
            </p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-primary px-6 py-2.5 self-start">
            + New Dream
          </button>
        </div>

        {/* Search bar */}
        <div className="mb-6 animate-fadeIn">
          <div className="relative max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search inventions semantically..."
              className="input-field pl-10 pr-10"
            />
            {query && (
              <button onClick={() => { setQuery(''); setSearchResults(null) }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searching && <p className="text-xs text-muted-foreground mt-1.5 ml-1">Searching...</p>}
          {searchResults !== null && !searching && (
            <p className="text-xs text-muted-foreground mt-1.5 ml-1">
              {searchResults.length > 0
                ? `${searchResults.length} semantic match${searchResults.length !== 1 ? 'es' : ''} for "${query}"`
                : `No matches found for "${query}"`}
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="loader" />
          </div>
        )}

        {/* Empty state */}
        {!loading && displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              {searchResults !== null ? <Search className="w-8 h-8 text-primary" /> : <Zap className="w-8 h-8 text-primary" />}
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {searchResults !== null ? 'No Matches Found' : 'No Inventions Yet'}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {searchResults !== null ? 'Try a different search query.' : 'Start your first dream session to see inventions here.'}
            </p>
            {searchResults === null && (
              <button onClick={() => navigate('/dashboard')} className="btn-primary px-8">Start Dreaming</button>
            )}
          </div>
        )}

        {/* Invention grid */}
        {!loading && displayed.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((inv: any) => {
              const chip = STATUS_CHIP[inv.status] || STATUS_CHIP.pending
              const inProgress = !['complete', 'failed'].includes(inv.status)
              return (
                <div key={inv.id}
                  onClick={() => inProgress ? navigate(`/stream/${inv.id}`) : navigate(`/invention/${inv.id}`)}
                  className="rounded-xl bg-card border border-border p-4 cursor-pointer hover:border-primary/40 transition-all animate-fadeIn">

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`chip ${chip.cls}`}>{chip.label}</span>
                        {inv.domain && <span className="chip chip-gray">{inv.domain}</span>}
                      </div>
                      <p className="text-foreground font-semibold text-sm leading-snug mb-1 truncate">
                        {inv.title || inv.seedConcept}
                      </p>
                      {inv.title && inv.title !== inv.seedConcept && (
                        <p className="text-muted-foreground text-xs truncate">{inv.seedConcept}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-3">
                      {inv.noveltyScore && (
                        <span className="text-xs text-muted-foreground">Novelty {Math.round(inv.noveltyScore * 100)}%</span>
                      )}
                      {inv.similarity != null && (
                        <span className="text-xs text-primary font-medium">
                          {Math.round(inv.similarity * 100)}% match
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> {timeAgo(inv.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {inv.status === 'complete' && (
                        <button onClick={e => { e.stopPropagation(); setSharingInv(inv) }}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                          <Share2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </button>
                      )}
                      <button onClick={e => handleDelete(e, inv.id)} disabled={deleting === inv.id}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                        {deleting === inv.id
                          ? <span className="spinner" />
                          : <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />}
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {sharingInv && (
        <ShareSheet
          inventionId={sharingInv.id}
          title={sharingInv.title || sharingInv.seedConcept}
          initialIsPublic={!!(sharingInv.isPublic ?? sharingInv.is_public)}
          onVisibilityChange={(isPublic) => {
            setInventions((prev) =>
              prev.map((i) => (i.id === sharingInv.id ? { ...i, isPublic, is_public: isPublic } : i)),
            )
            setSharingInv((curr: any) =>
              curr ? { ...curr, isPublic, is_public: isPublic } : curr,
            )
          }}
          onClose={() => setSharingInv(null)}
        />
      )}
    </div>
  )
}
