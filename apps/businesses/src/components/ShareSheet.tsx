import { useState } from 'react'
import { X, Copy, Check, Loader2 } from 'lucide-react'

const WhatsAppIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40">
    <rect width="48" height="48" rx="24" fill="#25D366" />
    <path
      fill="#fff"
      d="M24 10C16.27 10 10 16.27 10 24c0 2.52.68 4.88 1.86 6.92L10 38l7.28-1.82A13.94 13.94 0 0 0 24 38c7.73 0 14-6.27 14-14S31.73 10 24 10zm0 25.6a11.56 11.56 0 0 1-5.9-1.61l-.42-.25-4.32 1.08 1.1-4.2-.28-.44A11.56 11.56 0 1 1 24 35.6zm6.34-8.66c-.35-.17-2.06-1.01-2.38-1.13-.32-.11-.55-.17-.78.17-.23.35-.9 1.13-1.1 1.36-.2.23-.4.26-.75.09-.35-.17-1.47-.54-2.8-1.73-1.03-.92-1.73-2.06-1.93-2.4-.2-.35-.02-.53.15-.71.15-.15.35-.4.52-.61.17-.2.23-.35.35-.58.11-.23.06-.43-.03-.61-.09-.17-.78-1.89-1.07-2.59-.28-.68-.57-.58-.78-.59h-.67c-.23 0-.61.09-.93.43-.32.35-1.22 1.19-1.22 2.9s1.25 3.36 1.42 3.59c.17.23 2.46 3.75 5.96 5.26.83.36 1.48.57 1.99.73.84.27 1.6.23 2.2.14.67-.1 2.06-.84 2.35-1.66.29-.81.29-1.51.2-1.66-.08-.15-.31-.23-.66-.4z"
    />
  </svg>
)
const TelegramIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40">
    <rect width="48" height="48" rx="24" fill="#2AABEE" />
    <path
      fill="#fff"
      d="M34.96 14.1 10.9 23.08c-1.64.66-1.63 1.57-.3 1.98l6.18 1.93 14.3-9.02c.68-.41 1.3-.19.79.26L19.6 28.1l-.42 6.57c.62 0 .89-.28 1.23-.61l2.95-2.87 6.14 4.54c1.13.62 1.95.3 2.23-.05.29-.38 2.82-11.1 3.54-16.6.2-1.63-.61-2.27-1.9-2.97z"
    />
  </svg>
)
const XIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40">
    <rect width="48" height="48" rx="24" fill="#000" />
    <path
      fill="#fff"
      d="M26.37 22.28 34.48 13h-1.93l-7.04 8.18L19.74 13H13l8.51 12.38L13 35h1.93l7.44-8.65L28.26 35H35L26.37 22.28zm-2.63 3.06-.86-1.23L15.6 14.4h2.95l5.53 7.91.86 1.23 7.18 10.27h-2.95l-5.43-7.46z"
    />
  </svg>
)
const RedditIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40">
    <rect width="48" height="48" rx="24" fill="#FF4500" />
    <path
      fill="#fff"
      d="M38 24c0-1.93-1.57-3.5-3.5-3.5-.93 0-1.77.37-2.39.97C30.14 20.18 27.7 19.5 25 19.4l1.47-6.9 4.8 1.02a2.5 2.5 0 1 0 .27-1.97l-5.37-1.14a.5.5 0 0 0-.59.38l-1.64 7.72c-2.76.08-5.25.77-7.18 2.07a3.5 3.5 0 1 0-3.72 5.8 6.86 6.86 0 0 0-.04.62C13 30.72 18 34 24 34s11-3.28 11-7c0-.21-.01-.42-.04-.62A3.5 3.5 0 0 0 38 24zm-19.5 2a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm11.14 5.29C28.36 32.57 26.27 33 24 33s-4.36-.43-5.64-1.71a.5.5 0 0 1 .71-.71C20 31.51 21.86 32 24 32s4-.49 4.93-1.42a.5.5 0 0 1 .71.71zM28.5 28a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
    />
  </svg>
)
const FacebookIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40">
    <rect width="48" height="48" rx="24" fill="#1877F2" />
    <path
      fill="#fff"
      d="M31 13h-4c-3.31 0-6 2.69-6 6v3h-3v4h3v10h4V26h3l1-4h-4v-3c0-1.1.9-2 2-2h3v-4z"
    />
  </svg>
)
const LinkedInIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40">
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
    getUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: 'LinkedIn',
    Icon: LinkedInIcon,
    getUrl: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
]

interface ShareSheetProps {
  growthId: string
  title: string
  isPublic: boolean
  onClose: () => void
  onTogglePublic: (next: boolean) => Promise<void>
}

export function ShareSheet({ growthId, title, isPublic, onClose, onTogglePublic }: ShareSheetProps) {
  const [copied, setCopied] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const url = `${window.location.origin}/share/${growthId}`
  const text = `Check out this growth plan: ${title}`

  const handleCopy = () => {
    if (!isPublic) return // disable copy when not public
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const flipPublic = async () => {
    setErr(null)
    setToggling(true)
    try {
      await onTogglePublic(!isPublic)
    } catch (e) {
      setErr((e as Error).message || 'Failed to update visibility')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-t-xl sm:rounded-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-semibold">Share growth plan</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-muted-foreground text-xs mb-4 truncate">{title}</p>

        {/* Public toggle */}
        <div className="flex items-center justify-between rounded-lg bg-muted border border-border px-3 py-2 mb-4">
          <div>
            <p className="text-sm text-foreground font-medium">
              {isPublic ? 'Public' : 'Private'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPublic
                ? 'Anyone with the link can view'
                : 'Only you can view this plan'}
            </p>
          </div>
          <button
            onClick={flipPublic}
            disabled={toggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isPublic ? 'bg-primary' : 'bg-border'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                isPublic ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Copy link */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className={`flex-1 rounded-lg px-3 py-2 text-xs truncate border ${
              isPublic
                ? 'bg-muted border-border text-foreground'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            {url}
          </div>
          <button
            onClick={handleCopy}
            disabled={!isPublic || toggling}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {toggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Social grid */}
        <div className={`grid grid-cols-3 gap-2 ${!isPublic ? 'opacity-40 pointer-events-none' : ''}`}>
          {SOCIALS.map(({ name, Icon, getUrl }) => (
            <a
              key={name}
              href={getUrl(url, text)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <Icon />
              <span className="text-muted-foreground text-xs">{name}</span>
            </a>
          ))}
        </div>

        {err && (
          <p className="mt-4 text-xs text-red-400">{err}</p>
        )}

        <p className="text-muted-foreground text-xs text-center mt-5">
          {isPublic
            ? 'Anyone with the link can view this plan — no login required.'
            : 'Toggle Public to enable sharing.'}
        </p>
      </div>
    </div>
  )
}
