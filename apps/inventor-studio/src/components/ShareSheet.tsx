import { useEffect, useState } from 'react'
import { X, Copy, Check, Globe, Lock } from 'lucide-react'
import { inventionsApi } from '@/lib/api'

/* Each icon is a self-contained SVG: brand-colored rounded-square bg + white logo */
const WhatsAppIcon = () => (
  <svg viewBox="0 0 48 48" width="44" height="44">
    <rect width="48" height="48" rx="24" fill="#25D366" />
    <path
      fill="#fff"
      d="M24 10C16.27 10 10 16.27 10 24c0 2.52.68 4.88 1.86 6.92L10 38l7.28-1.82A13.94 13.94 0 0 0 24 38c7.73 0 14-6.27 14-14S31.73 10 24 10zm0 25.6a11.56 11.56 0 0 1-5.9-1.61l-.42-.25-4.32 1.08 1.1-4.2-.28-.44A11.56 11.56 0 1 1 24 35.6zm6.34-8.66c-.35-.17-2.06-1.01-2.38-1.13-.32-.11-.55-.17-.78.17-.23.35-.9 1.13-1.1 1.36-.2.23-.4.26-.75.09-.35-.17-1.47-.54-2.8-1.73-1.03-.92-1.73-2.06-1.93-2.4-.2-.35-.02-.53.15-.71.15-.15.35-.4.52-.61.17-.2.23-.35.35-.58.11-.23.06-.43-.03-.61-.09-.17-.78-1.89-1.07-2.59-.28-.68-.57-.58-.78-.59h-.67c-.23 0-.61.09-.93.43-.32.35-1.22 1.19-1.22 2.9s1.25 3.36 1.42 3.59c.17.23 2.46 3.75 5.96 5.26.83.36 1.48.57 1.99.73.84.27 1.6.23 2.2.14.67-.1 2.06-.84 2.35-1.66.29-.81.29-1.51.2-1.66-.08-.15-.31-.23-.66-.4z"
    />
  </svg>
)

const TelegramIcon = () => (
  <svg viewBox="0 0 48 48" width="44" height="44">
    <rect width="48" height="48" rx="24" fill="#2AABEE" />
    <path
      fill="#fff"
      d="M34.96 14.1 10.9 23.08c-1.64.66-1.63 1.57-.3 1.98l6.18 1.93 14.3-9.02c.68-.41 1.3-.19.79.26L19.6 28.1l-.42 6.57c.62 0 .89-.28 1.23-.61l2.95-2.87 6.14 4.54c1.13.62 1.95.3 2.23-.05.29-.38 2.82-11.1 3.54-16.6.2-1.63-.61-2.27-1.9-2.97z"
    />
  </svg>
)

const XIcon = () => (
  <svg viewBox="0 0 48 48" width="44" height="44">
    <rect width="48" height="48" rx="24" fill="#000" />
    <path
      fill="#fff"
      d="M26.37 22.28 34.48 13h-1.93l-7.04 8.18L19.74 13H13l8.51 12.38L13 35h1.93l7.44-8.65L28.26 35H35L26.37 22.28zm-2.63 3.06-.86-1.23L15.6 14.4h2.95l5.53 7.91.86 1.23 7.18 10.27h-2.95l-5.43-7.46z"
    />
  </svg>
)

const RedditIcon = () => (
  <svg viewBox="0 0 48 48" width="44" height="44">
    <rect width="48" height="48" rx="24" fill="#FF4500" />
    <path
      fill="#fff"
      d="M38 24c0-1.93-1.57-3.5-3.5-3.5-.93 0-1.77.37-2.39.97C30.14 20.18 27.7 19.5 25 19.4l1.47-6.9 4.8 1.02a2.5 2.5 0 1 0 .27-1.97l-5.37-1.14a.5.5 0 0 0-.59.38l-1.64 7.72c-2.76.08-5.25.77-7.18 2.07a3.5 3.5 0 1 0-3.72 5.8 6.86 6.86 0 0 0-.04.62C13 30.72 18 34 24 34s11-3.28 11-7c0-.21-.01-.42-.04-.62A3.5 3.5 0 0 0 38 24zm-19.5 2a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm11.14 5.29C28.36 32.57 26.27 33 24 33s-4.36-.43-5.64-1.71a.5.5 0 0 1 .71-.71C20 31.51 21.86 32 24 32s4-.49 4.93-1.42a.5.5 0 0 1 .71.71zM28.5 28a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
    />
  </svg>
)

const FacebookIcon = () => (
  <svg viewBox="0 0 48 48" width="44" height="44">
    <rect width="48" height="48" rx="24" fill="#1877F2" />
    <path
      fill="#fff"
      d="M31 13h-4c-3.31 0-6 2.69-6 6v3h-3v4h3v10h4V26h3l1-4h-4v-3c0-1.1.9-2 2-2h3v-4z"
    />
  </svg>
)

const LinkedInIcon = () => (
  <svg viewBox="0 0 48 48" width="44" height="44">
    <rect width="48" height="48" rx="24" fill="#0A66C2" />
    <path
      fill="#fff"
      d="M15 19h4v14h-4V19zm2-6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm7 6h3.6v1.9h.05C28.18 19.9 29.63 19 31.5 19 35.65 19 36 21.87 36 25.44V33h-4v-6.78c0-1.62-.03-3.7-2.25-3.7-2.26 0-2.6 1.76-2.6 3.58V33h-4V19z"
    />
  </svg>
)

const SOCIALS = [
  {
    name: 'WhatsApp',
    Icon: WhatsAppIcon,
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`,
  },
  {
    name: 'Telegram',
    Icon: TelegramIcon,
    getUrl: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: 'X',
    Icon: XIcon,
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: 'Reddit',
    Icon: RedditIcon,
    getUrl: (url: string, title: string) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    name: 'Facebook',
    Icon: FacebookIcon,
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: 'LinkedIn',
    Icon: LinkedInIcon,
    getUrl: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
]

interface Props {
  inventionId: string
  title: string
  /** Initial public state from parent (if known). Sheet still confirms with backend. */
  initialIsPublic?: boolean
  /** Notifies parent so its local list/detail state stays in sync with the toggle. */
  onVisibilityChange?: (isPublic: boolean) => void
  onClose: () => void
}

// Public app domain — used for share links sent to Telegram/Facebook/LinkedIn.
// Falls back to window.location.origin in dev so localhost links still work.
const SHARE_BASE =
  typeof window !== 'undefined' && /^(localhost|127\.|192\.168\.)/.test(window.location.hostname)
    ? window.location.origin
    : 'https://inventorstudio.xyz'

export default function ShareSheet({
  inventionId,
  title,
  initialIsPublic,
  onVisibilityChange,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [isPublic, setIsPublic] = useState<boolean>(!!initialIsPublic)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const url = `${SHARE_BASE}/showcase/${inventionId}`
  const text = `Check out this invention: ${title}`

  // On open: auto-flip the invention public so the share URL actually works.
  // (Backend route /api/public/invention/:id 404s if isPublic === false.)
  // No-op if it's already public — backend just returns ok:true.
  useEffect(() => {
    let cancelled = false
    if (initialIsPublic) return
    setBusy(true)
    inventionsApi
      .setVisibility(inventionId, true)
      .then((r) => {
        if (cancelled) return
        setIsPublic(r.isPublic)
        onVisibilityChange?.(r.isPublic)
      })
      .catch((e) => {
        if (cancelled) return
        setErr(
          e?.response?.data?.message ||
            "Couldn't make this invention public — the share link won't work until you toggle it on.",
        )
      })
      .finally(() => !cancelled && setBusy(false))
    return () => {
      cancelled = true
    }
    // run once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const togglePublic = async () => {
    const next = !isPublic
    setBusy(true)
    setErr(null)
    try {
      const r = await inventionsApi.setVisibility(inventionId, next)
      setIsPublic(r.isPublic)
      onVisibilityChange?.(r.isPublic)
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to update visibility')
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = () => {
    if (!isPublic) return
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-t-2xl p-6 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-foreground font-head font-bold text-base">
            Share Invention
          </p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-muted-foreground text-xs mb-4 truncate">{title}</p>

        {/* Visibility row — drives whether the showcase URL actually works */}
        <div
          className="flex items-center justify-between gap-3 mb-4 px-3 py-2.5 rounded-xl"
          style={{
            background: isPublic ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isPublic ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isPublic ? (
              <Globe className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p
                className="text-xs font-bold font-head"
                style={{ color: isPublic ? '#4ade80' : '#9ca3af' }}
              >
                {isPublic ? 'Public' : 'Private'}
              </p>
              <p className="text-muted-foreground text-[10px] truncate">
                {isPublic
                  ? 'Anyone with the link can view'
                  : 'Only you can view this invention'}
              </p>
            </div>
          </div>
          <button
            onClick={togglePublic}
            disabled={busy}
            className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0"
            style={{ opacity: busy ? 0.5 : 1 }}
          >
            {busy ? '...' : isPublic ? 'Make Private' : 'Make Public'}
          </button>
        </div>

        {err && (
          <p
            className="text-xs mb-3 px-3 py-2 rounded-lg"
            style={{
              color: '#fca5a5',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
            }}
          >
            {err}
          </p>
        )}

        <div className="flex items-center gap-2 mb-6" style={{ opacity: isPublic ? 1 : 0.4 }}>
          <div className="flex-1 bg-muted border border-border rounded-xl px-3 py-2.5 text-xs text-muted-foreground truncate">
            {url}
          </div>
          <button
            onClick={handleCopy}
            disabled={!isPublic}
            className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-1.5 flex-shrink-0"
            style={{ cursor: isPublic ? 'pointer' : 'not-allowed' }}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3" style={{ opacity: isPublic ? 1 : 0.4 }}>
          {SOCIALS.map(({ name, Icon, getUrl }) => (
            <a
              key={name}
              href={isPublic ? getUrl(url, text) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!isPublic) e.preventDefault()
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-colors"
              style={{
                cursor: isPublic ? 'pointer' : 'not-allowed',
                pointerEvents: isPublic ? 'auto' : 'none',
              }}
            >
              <Icon />
              <span className="text-muted-foreground text-xs">{name}</span>
            </a>
          ))}
        </div>

        <p className="text-muted-foreground text-xs text-center mt-5">
          {isPublic
            ? 'Anyone with this link can view the invention — no login required.'
            : 'Make this invention public to share it with anyone.'}
        </p>
      </div>
    </div>
  )
}
