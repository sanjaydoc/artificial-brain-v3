import { useNavigate } from 'react-router-dom'
import { useBrain } from '@/context/BrainContext'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'
import { PromptBox } from '@/components/PromptBox'
interface AppItem {
  id: string
  label: string
  materialIcon: string  // Google Material Symbols icon name
  path?: string
  href?: string
  adminOnly?: boolean
}

const APPS: AppItem[] = [
  { id: 'chat', label: 'Chat', materialIcon: 'chat', path: '/chat' },
  { id: 'config', label: 'Config', materialIcon: 'settings', path: '/config', adminOnly: true },
  { id: 'neural', label: 'Neural Map', materialIcon: 'neurology', path: '/neural' },
  { id: 'robot', label: 'Robot', materialIcon: 'smart_toy', path: '/robot' },
  { id: 'biz', label: 'Businesses', materialIcon: 'business', href: '/businesses' },
  { id: 'inventor', label: 'Inventor Studio', materialIcon: 'lightbulb', href: '/inventor-studio' },
  { id: 'electronics', label: 'Electronics', materialIcon: 'memory', href: '/inventor-studio/electronics' },
  { id: 'commands', label: 'Commands', materialIcon: 'terminal', path: '/commands' },
  { id: 'memory-mgmt', label: 'Memory Mgmt', materialIcon: 'database', path: '/memory-mgmt' },
  { id: 'genesis', label: 'Genesis', materialIcon: 'auto_awesome', href: '/genesis/' },
  { id: 'layer-orch', label: 'Orchestrator', materialIcon: 'account_tree', path: '/layer-orchestrator' },
  { id: 'layer-mem', label: 'Memory Cfg', materialIcon: 'storage', path: '/layer-memory' },
  { id: 'layer-tools', label: 'Tools Cfg', materialIcon: 'build', path: '/layer-tools' },
  { id: 'layer-id', label: 'Identity', materialIcon: 'fingerprint', path: '/layer-identity' },
  { id: 'layer-obs', label: 'Observability', materialIcon: 'monitoring', path: '/layer-observability' },
  { id: 'layer-guard', label: 'Guardrails', materialIcon: 'verified_user', path: '/layer-guardrails' },
  { id: 'admin', label: 'Admin', materialIcon: 'admin_panel_settings', path: '/admin', adminOnly: true },
]

function openApp(app: AppItem, navigate: ReturnType<typeof useNavigate>) {
  if (app.href) window.open(app.href, '_blank')
  else navigate(app.path!)
}

function AppIcon({ app, size = 'md' }: { app: AppItem; size?: 'md' | 'sm' }) {
  if (size === 'sm') {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/8 dark:bg-primary/12 border border-primary/15 dark:border-primary/20">
        <span className="material-symbols-rounded text-primary" style={{ fontSize: 18 }}>{app.materialIcon}</span>
      </div>
    )
  }
  return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl bg-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] dark:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] dark:hover:bg-[rgba(255,255,255,0.12)] hover:border-primary/30"
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
      <span className="material-symbols-rounded text-primary drop-shadow-sm" style={{ fontSize: 26 }}>{app.materialIcon}</span>
    </div>
  )
}

const STORAGE_KEY = 'ab-icon-order'

function loadOrder(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const ids = JSON.parse(saved) as string[]
      // Validate — all APPS ids present
      const appIds = new Set(APPS.map((a) => a.id))
      if (ids.length === appIds.size && ids.every((id) => appIds.has(id))) return ids
    }
  } catch { /* ignore */ }
  return APPS.map((a) => a.id)
}

function saveOrder(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

function getOrCreateToken(): string {
  const KEY = 'ab_agent_token'
  let t = localStorage.getItem(KEY)
  if (!t) {
    t = crypto.randomUUID().replace(/-/g, '')
    localStorage.setItem(KEY, t)
  }
  return t
}

export default function Home() {
  const navigate = useNavigate()
  const { connected } = useBrain()
  const { user, logout, isAdmin } = useAuth()
  const [agentToken] = useState(() => getOrCreateToken())
  const [agentConnected, setAgentConnected] = useState(false)
  const [connectCopied, setConnectCopied] = useState(false)

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('brain_theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('brain_theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Listen for agent_connected WS messages
  useEffect(() => {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${location.host}/ws`)
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data)
        if (d.agent_connected !== undefined) setAgentConnected(!!d.agent_connected)
      } catch {}
    }
    return () => ws.close()
  }, [])

  const [clock, setClock] = useState('')
  const [startOpen, setStartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [, setSearchQuery] = useState('')
  const startRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Drag-and-drop state (document-level mouse events)
  const [order, setOrder] = useState<string[]>(loadOrder)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null)

  const visibleApps = APPS.filter(a => !a.adminOnly || isAdmin)
  const orderedApps = order.map((id) => visibleApps.find((a) => a.id === id)!).filter(Boolean)

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, moved: false }
    setDraggingId(id)
  }, [])

  // Document-level mousemove + mouseup so drag works even when pointer leaves the icon
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 8) return
      d.moved = true

      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el) return
      const target = el.closest<HTMLElement>('[data-appid]')
      if (!target) return
      const overId = target.dataset.appid
      if (!overId || overId === d.id) return

      setOrder((prev) => {
        const next = [...prev]
        const fromIdx = next.indexOf(d.id)
        const toIdx = next.indexOf(overId)
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev
        next.splice(fromIdx, 1)
        next.splice(toIdx, 0, d.id)
        return next
      })
    }

    const onUp = () => {
      const d = dragRef.current
      if (!d) return
      if (d.moved) {
        setOrder((prev) => { saveOrder(prev); return prev })
      }
      dragRef.current = null
      setDraggingId(null)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  const handleIconClick = useCallback((app: AppItem) => {
    // Only fire if it wasn't a drag
    if (dragRef.current?.moved) return
    openApp(app, navigate)
  }, [navigate])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
          '\n' +
          now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      )
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  // Close popups on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (startOpen && startRef.current && !startRef.current.contains(e.target as Node)) {
        setStartOpen(false)
      }
      if (searchOpen && searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [startOpen, searchOpen])

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  // Psi loading spinner — 2s first visit, 1.5s on refresh
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const visited = localStorage.getItem('ab_home_visited')
    const delay = visited ? 1500 : 2000
    localStorage.setItem('ab_home_visited', '1')
    const t = setTimeout(() => setLoading(false), delay)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col justify-between z-10">
      {/* Psi Loading Overlay */}
      <div className={`fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-5 transition-all duration-700 pointer-events-auto ${loading ? 'opacity-100 visible' : 'opacity-0 invisible !pointer-events-none'}`}>
        <div className="relative w-16 h-16">
          <div className="psi-ring1 absolute inset-0 rounded-full border-2 border-primary/15 border-t-primary" />
          <div className="psi-ring2 absolute inset-2 rounded-full border-2 border-blue-300/30 border-t-blue-300" />
          <div className="psi-char absolute inset-0 flex items-center justify-center text-2xl font-kanit font-bold text-primary">
            {'\u03C8'}
          </div>
        </div>
        <div className="font-kanit text-[0.72rem] text-muted-foreground tracking-[1.5px] uppercase">
          Initializing Neural Interface
        </div>
        <div className="flex gap-1.5 items-center mt-1">
          <span className="psi-dot w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="psi-dot w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="psi-dot w-1.5 h-1.5 rounded-full bg-primary" />
        </div>
      </div>

      {/* Background */}
      <div className="fixed inset-0 z-0 bg-background" />

      {/* Top-right auth buttons */}
      <div className="fixed top-4 right-5 z-40 flex items-center gap-2 pointer-events-auto">
        {user ? (
          <button
            onClick={() => { logout(); navigate('/') }}
            className="px-4 py-1.5 rounded-lg text-[0.7rem] font-medium text-neutral-400 hover:text-foreground border border-border hover:border-border/60 bg-accent hover:bg-accent backdrop-blur-md transition-all"
          >
            Logout
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-1.5 rounded-lg text-[0.7rem] font-medium text-foreground/80 hover:text-foreground border border-border hover:border-border/60 bg-accent hover:bg-accent backdrop-blur-md transition-all"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-1.5 rounded-lg text-[0.7rem] font-medium text-white bg-primary hover:bg-primary/90 transition-all"
            >
              Sign Up
            </button>
          </>
        )}
      </div>

      {/* Desktop icons (draggable) — glassmorphism grid */}
      <div className="relative z-10 pt-14 px-5 pb-16 flex-1">
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
          {orderedApps.map((app) => (
            <div
              key={app.id}
              data-appid={app.id}
              onMouseDown={(e) => handleMouseDown(e, app.id)}
              onClick={() => handleIconClick(app)}
              className={`w-[76px] flex flex-col items-center gap-1.5 p-2 rounded-xl cursor-grab transition-all hover:bg-primary/5 dark:hover:bg-primary/10 select-none pointer-events-auto ${
                draggingId === app.id ? 'opacity-30 scale-90' : ''
              }`}
            >
              <AppIcon app={app} />
              <span className="text-[0.6rem] font-poppins text-foreground/80 dark:text-foreground/70 text-center leading-tight max-w-[72px] truncate pointer-events-none drop-shadow-sm">
                {app.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Box — bottom center, doesn't block Spline cursor tracking */}
      <div className="fixed bottom-[46px] left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 pointer-events-auto">
        <p className="text-center text-base text-foreground font-poppins mb-3">
          How Can I Help You
        </p>
        <PromptBox
          onSend={(message) => {
            sessionStorage.setItem('ab_pending_msg', message);
            navigate('/chat');
          }}
        />
      </div>

      {/* Taskbar */}
      <div className="relative z-10 bg-card/90 backdrop-blur-xl border-t border-border px-4 h-[34px] flex items-center gap-1.5 pointer-events-auto">

        {/* Start button — AB app icon */}
        <div ref={startRef} className="relative">
          <button
            onClick={() => { setStartOpen((v) => !v) }}
            className="w-[30px] h-[30px] rounded-[5px] flex items-center justify-center hover:bg-accent transition-colors"
            title="Start"
          >
            <span className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center text-white font-black text-[0.45rem] font-kanit select-none">AB</span>
          </button>

          {/* Start menu popup */}
          {startOpen && (
            <div className="absolute bottom-[42px] left-0 w-[300px] bg-card border border-border rounded-[14px] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,.1)] p-3 z-50">
              <div className="text-[0.6rem] font-kanit uppercase tracking-[1.5px] text-primary mb-2.5 pl-1">
                All Apps
              </div>
              <div className="grid grid-cols-4 gap-2">
                {APPS.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => { openApp(app, navigate); setStartOpen(false) }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <AppIcon app={app} size="sm" />
                    <span className="text-[0.55rem] text-foreground/80 text-center font-poppins leading-tight">
                      {app.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center pinned apps (internal pages only) */}
        <div className="flex-1 flex items-center justify-center gap-1">
          {visibleApps.filter((a) => a.path).map((app) => (
            <button
              key={app.id}
              onClick={() => navigate(app.path!)}
              className="w-7 h-7 rounded-[5px] flex items-center justify-center hover:bg-accent transition-colors"
              title={app.label}
            >
              <span className="material-symbols-rounded text-foreground/70" style={{ fontSize: 16 }}>{app.materialIcon}</span>
            </button>
          ))}
        </div>

        {/* Local Agent — connect button in taskbar */}
        <button
          onClick={() => {
            if (agentConnected) return;
            const cmd = `npx brain-agent@3.1.0 --url ${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/agent-ws --token ${agentToken}`;
            navigator.clipboard.writeText(cmd);
            setConnectCopied(true);
            setTimeout(() => setConnectCopied(false), 3000);
          }}
          className={`flex items-center gap-1.5 px-2.5 h-[24px] rounded-[5px] text-[0.6rem] font-medium transition-colors shrink-0 ${
            agentConnected
              ? 'text-emerald-600 hover:bg-accent cursor-default'
              : connectCopied
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer'
          }`}
          title={agentConnected ? 'Local Agent connected' : 'Click to copy connect command'}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${agentConnected ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
          {agentConnected ? 'Agent' : connectCopied ? 'Copied!' : 'Connect Agent'}
        </button>

        {/* Right: tray + dark mode + clock */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
          </div>
          <button
            onClick={() => setDarkMode(d => !d)}
            className="w-[22px] h-[22px] rounded-[4px] grid place-items-center hover:bg-accent transition-colors text-foreground/70"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <span className="text-[0.6rem] font-mono text-foreground/70 text-right leading-tight whitespace-pre">
            {clock}
          </span>
        </div>
      </div>
    </div>
  )
}
