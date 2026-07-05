import { DragEvent, FormEvent, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Upload as UploadIcon,
  Globe,
  Trash2,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AppHeader } from '@/components/AppHeader'
import {
  uploadsApi,
  scrapeApi,
  type UploadDoc,
  type ScrapeDoc,
  type UploadStatus,
  type ScrapeStatus,
} from '@/lib/api'

const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

const fmtDate = (iso: string) => new Date(iso).toLocaleString()

function StatusPill({ status }: { status: UploadStatus | ScrapeStatus }) {
  const config: Record<string, { color: string; label: string; icon: 'spin' | 'ok' | 'err' }> = {
    uploaded: { color: 'text-primary bg-primary/10 border-primary/20', label: 'queued', icon: 'spin' },
    queued: { color: 'text-primary bg-primary/10 border-primary/20', label: 'queued', icon: 'spin' },
    fetching: { color: 'text-primary bg-primary/10 border-primary/20', label: 'fetching', icon: 'spin' },
    parsing: { color: 'text-primary bg-primary/10 border-primary/20', label: 'parsing', icon: 'spin' },
    chunking: { color: 'text-primary bg-primary/10 border-primary/20', label: 'chunking', icon: 'spin' },
    ready: { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', label: 'ready', icon: 'ok' },
    error: { color: 'text-red-400 bg-red-400/10 border-red-400/20', label: 'error', icon: 'err' },
  }
  const c = config[status] || config.queued
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${c.color}`}>
      {c.icon === 'spin' && <Loader2 className="h-3 w-3 animate-spin" />}
      {c.icon === 'ok' && <CheckCircle2 className="h-3 w-3" />}
      {c.icon === 'err' && <AlertCircle className="h-3 w-3" />}
      {c.label}
    </span>
  )
}

export default function Workspace() {
  const { user } = useAuth()
  const [uploads, setUploads] = useState<UploadDoc[]>([])
  const [scrapes, setScrapes] = useState<ScrapeDoc[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    setRefreshing(true)
    try {
      const [u, s] = await Promise.all([uploadsApi.list(), scrapeApi.list()])
      setUploads(u)
      setScrapes(s)
    } catch (err) {
      console.error('list error', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  if (!user) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-3">Sources</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Feed your business to the agents
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Upload PDFs, decks, spreadsheets, and notes. Paste your website + social URLs. Agents
            ingest everything and use it as context for your growth analysis.
          </p>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UploadCard onDone={refresh} />
          <ScrapeCard onDone={refresh} />
        </div>

        <div className="mt-10">
          <SourceList
            title="Uploaded files"
            empty="No files yet. Drag a PDF, DOCX, or XLSX above to begin."
            count={uploads.length}
            refreshing={refreshing}
          >
            {uploads.map((u) => (
              <UploadRow
                key={u.id}
                doc={u}
                onDelete={async () => {
                  await uploadsApi.remove(u.id)
                  refresh()
                }}
              />
            ))}
          </SourceList>
        </div>

        <div className="mt-8">
          <SourceList
            title="Scraped URLs"
            empty="No URLs yet. Paste your website or social profiles above."
            count={scrapes.length}
            refreshing={refreshing}
          >
            {scrapes.map((s) => (
              <ScrapeRow
                key={s.id}
                doc={s}
                onDelete={async () => {
                  await scrapeApi.remove(s.id)
                  refresh()
                }}
              />
            ))}
          </SourceList>
        </div>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload zone
// ─────────────────────────────────────────────────────────────────────────────
function UploadCard({ onDone }: { onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const submit = async (files: File[]) => {
    setError(null)
    if (!files.length) return
    setBusy(true)
    setProgress(0)
    try {
      await uploadsApi.upload(files, setProgress)
      onDone()
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        (err as Error).message ||
        'Upload failed'
      setError(msg)
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length) submit(files)
  }

  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="h-9 w-9 rounded-lg grid place-items-center bg-primary/10 border border-primary/20">
          <UploadIcon className="h-4 w-4 text-primary" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">Upload files</h2>
          <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX, CSV, MD, TXT — up to 50 MB each, 10 at a time</p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`group relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver
            ? 'border-primary/60 bg-primary/5'
            : 'border-border hover:border-primary/30 hover:bg-accent'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.md,.markdown,.txt,.json,.html,.htm"
          onChange={(e) => submit(Array.from(e.target.files || []))}
        />
        <UploadIcon className="h-7 w-7 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
        <p className="mt-3 text-sm text-foreground">
          {busy ? `Uploading… ${progress}%` : 'Drop files here, or click to browse'}
        </p>
        {busy && (
          <div className="mt-4 h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Scrape (URL paste)
// ─────────────────────────────────────────────────────────────────────────────
function ScrapeCard({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const urls = text
      .split(/\r?\n|,/)
      .map((u) => u.trim())
      .filter(Boolean)
    if (!urls.length) {
      setError('Paste at least one URL')
      return
    }
    setBusy(true)
    try {
      await scrapeApi.scrape(urls)
      setText('')
      onDone()
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        (err as Error).message ||
        'Scrape failed'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="h-9 w-9 rounded-lg grid place-items-center bg-primary/10 border border-primary/20">
          <Globe className="h-4 w-4 text-primary" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">Paste URLs</h2>
          <p className="text-xs text-muted-foreground">Your website + social profiles. One per line — up to 10 at a time.</p>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'https://yourbusiness.com\nhttps://x.com/yourhandle\nhttps://linkedin.com/company/your-co'}
          rows={6}
          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground font-mono text-foreground"
        />
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Best with public pages — agents respect robots.txt and rate limits.
          </span>
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Scrape
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// List wrappers
// ─────────────────────────────────────────────────────────────────────────────
function SourceList({
  title,
  empty,
  count,
  refreshing,
  children,
}: {
  title: string
  empty: string
  count: number
  refreshing: boolean
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">
          {title} <span className="text-muted-foreground font-normal">({count})</span>
        </h2>
        {refreshing && <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />}
      </div>
      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-muted">{children}</div>
      )}
    </section>
  )
}

function UploadRow({ doc, onDelete }: { doc: UploadDoc; onDelete: () => void }) {
  return (
    <div className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-border last:border-0">
      <div className="col-span-12 md:col-span-6 flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <div className="text-sm text-foreground truncate">{doc.fileName}</div>
          <div className="text-xs text-muted-foreground">
            {doc.mimeType} · {fmtBytes(doc.size)} · {doc.chunkCount} chunks
          </div>
        </div>
      </div>
      <div className="col-span-6 md:col-span-3 text-xs text-muted-foreground">{fmtDate(doc.createdAt)}</div>
      <div className="col-span-3 md:col-span-2"><StatusPill status={doc.status} /></div>
      <div className="col-span-3 md:col-span-1 flex justify-end">
        <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {doc.error && (
        <div className="col-span-12 text-xs text-red-400 -mt-1">{doc.error}</div>
      )}
    </div>
  )
}

function ScrapeRow({ doc, onDelete }: { doc: ScrapeDoc; onDelete: () => void }) {
  return (
    <div className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-border last:border-0">
      <div className="col-span-12 md:col-span-6 flex items-center gap-3 min-w-0">
        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <div className="text-sm text-foreground truncate">
            {doc.title || doc.url}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {doc.url} · {doc.kind} · {doc.chunkCount} chunks
          </div>
        </div>
      </div>
      <div className="col-span-6 md:col-span-3 text-xs text-muted-foreground">{fmtDate(doc.createdAt)}</div>
      <div className="col-span-3 md:col-span-2"><StatusPill status={doc.status} /></div>
      <div className="col-span-3 md:col-span-1 flex justify-end">
        <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {doc.error && (
        <div className="col-span-12 text-xs text-red-400 -mt-1">{doc.error}</div>
      )}
    </div>
  )
}
