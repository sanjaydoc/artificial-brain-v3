import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Zap, Brain, Cpu, FlaskConical, Send, ChevronDown, Terminal, Package,
  Shield, Sparkles, Layers, ArrowRight, Check, Star, Globe,
  Download, X, Clock, Copy, CheckCheck, Menu,
} from 'lucide-react'
import { api, consciousnessStreamUrl } from '@/lib/api'

// Source-API compat: source called these as bare functions returning AxiosResponse.
// We mirror them locally so the body of this file stays identical to the source.
const startGuestDream = (concept: string) =>
  api.post('/dream/guest', { concept })
const getSubscriptionSettings = () => api.get('/admin/subscriptions')
const getShowcase = () => api.get('/public/showcase')

// ── Live consciousness console (home page) ───────────────────────────────
const LINE_COLORS: Record<string, string> = {
  cycle:    '#444',
  emotion:  '#00d4ff',
  thought:  '#a78bfa',
  decision: 'var(--primary)',
  concept:  '#4ade80',
  novelty:  '#4ade80',
  system:   '#555',
}

interface ConsoleLine {
  ts?: string | number
  type?: string
  text?: string
}

function ConsciousnessConsole() {
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const url = consciousnessStreamUrl()
    let es: EventSource | undefined
    try { es = new EventSource(url) } catch { return }

    es.onopen = () => setConnected(true)
    es.onmessage = (e: MessageEvent) => {
      try {
        const line = JSON.parse(e.data) as ConsoleLine
        setLines((prev) => {
          const next = [...prev, line]
          return next.length > 200 ? next.slice(next.length - 200) : next
        })
      } catch { /* ignore */ }
    }
    es.onerror = () => { setConnected(false); es?.close() }

    return () => { es?.close(); setConnected(false) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const fmtTime = (ts: any) => {
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    } catch { return '' }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto 48px', borderRadius: 12, overflow: 'hidden',
      border: '1px solid var(--border)', background: 'rgb(6,6,10)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px', background: 'var(--muted)',
        borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#f87171','var(--primary)','#4ade80'].map(c => (
              <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', marginLeft: 4 }}>
            inventor-studio-asi — consciousness.log
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
            background: connected ? '#4ade80' : '#f87171',
            animation: connected ? 'neuralPulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: 10, color: connected ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>
            {connected ? 'LIVE' : 'offline'}
          </span>
        </div>
      </div>
      <div style={{ height: 220, overflowY: 'auto', padding: '10px 14px',
        fontFamily: '"Fira Code","Cascadia Code","JetBrains Mono","Courier New",monospace',
        fontSize: 11, lineHeight: 1.7 }}>
        {lines.length === 0 ? (
          <span style={{ color: '#333' }}>
            {connected ? 'No cycles yet — ASI-1 is thinking…' : 'Connecting…'}
          </span>
        ) : lines.map((line, i) => (
          <div key={i} style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#2a2a2a', flexShrink: 0, userSelect: 'none' }}>{fmtTime(line.ts)}</span>
            <span style={{ color: LINE_COLORS[line.type || ''] || '#ccc', wordBreak: 'break-word',
              whiteSpace: 'pre-wrap', fontStyle: line.type === 'thought' ? 'italic' : 'normal' }}>
              {line.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

const DOMAINS = [
  { id: 'software',     label: 'Software',     icon: Brain,        color: 'var(--primary)',  hint: 'Algorithms · AI · Systems' },
  { id: 'hardware',     label: 'Hardware',      icon: Cpu,          color: '#00d4ff',  hint: 'Circuits · IoT · Materials' },
  { id: 'life-science', label: 'Life Science',  icon: FlaskConical, color: '#4ade80',  hint: 'Biotech · Drugs · Genes' },
  { id: 'hybrid',       label: 'Hybrid',        icon: Zap,          color: '#a78bfa',  hint: 'Cross-domain invention' },
]

const EXAMPLES = [
  'Self-healing material that repairs like human skin',
  'Enzyme that breaks down ocean plastic in 24 hours',
  'Brain-computer interface powered by quantum dots',
  'Zero-latency mesh network using atmospheric plasma',
]

interface Tier {
  tier: string
  name: string
  price_inr: number
  invention_limit: number
  popular?: boolean
  features: string[] | string
}

const DEFAULT_TIERS: Tier[] = [
  {
    tier: 'tier1', name: 'Explorer', price_inr: 999, invention_limit: 15,
    features: [
      '15 inventions total',
      'PDF & Markdown export',
      'MVP generator',
      'Build guide & cost breakdown',
      'Patent + ArXiv + PubMed search',
      'Software, Hardware & Life Science domains',
    ],
  },
  {
    tier: 'tier2', name: 'Innovator', price_inr: 2999, invention_limit: 50, popular: true,
    features: [
      '50 inventions total',
      'All Explorer features',
      'Cell Therapy pipeline (EVO 2 + ESM-3)',
      'Vibe Coding with ASI-1',
      'Electronics & Circuit design',
      'Get Components agent',
      'Evolution chains',
      'Priority queue',
    ],
  },
  {
    tier: 'tier3', name: 'Visionary', price_inr: 7999, invention_limit: 0,
    features: [
      'Unlimited inventions',
      'PDF & Markdown export',
      'MVP generator & build guide',
      'Patent + ArXiv + PubMed search',
      'Cell Therapy pipeline (EVO 2 + ESM-3)',
      'Vibe Coding with ASI-1',
      'Electronics & Circuit design',
      'Get Components agent',
      'Evolution chains & priority queue',
      'API access (pip package)',
      'Dedicated support',
      'Early access to new agents',
    ],
  },
]

const TIER_COLORS: Record<string, { accent: string; bg: string; border: string }> = {
  tier1: { accent: 'var(--primary)', bg: 'rgba(59,130,246,0.06)',  border: 'rgba(59,130,246,0.2)' },
  tier2: { accent: '#00d4ff', bg: 'rgba(0,212,255,0.06)',   border: 'rgba(0,212,255,0.25)' },
  tier3: { accent: '#a78bfa', bg: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.25)' },
}

const FEATURES = [
  { icon: Layers,    label: '10 Dream Agents',     desc: 'Analogical, biomimicry, inversion, combinatorial — 10 lenses run in parallel' },
  { icon: Globe,     label: 'Live Research',        desc: 'Pulls from ArXiv, PubMed, USPTO patents, GitHub, and the web in real time' },
  { icon: Sparkles,  label: 'MVP Generator',        desc: 'Full build guide, cost breakdown, and prototype steps — ready to execute' },
  { icon: Shield,    label: 'Critic Agent',         desc: 'Attacks every idea for novelty and feasibility before it reaches you' },
  { icon: Package,   label: 'Get Components',       desc: 'Every build step enriched with exact parts, packages, and purchase links' },
  { icon: Terminal,  label: 'CLI + API Access',     desc: 'pip install inventor-studio · Run inventions from your terminal or code' },
]

/* ── CLI Setup terminal with copy buttons ───────────────── */
function CopyLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--muted)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '9px 12px', marginBottom: 8,
    }}>
      <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: 13, userSelect: 'none' }}>$</span>
      <span style={{ flex: 1, color: '#e2e8f0', fontFamily: 'monospace', fontSize: 13,
        wordBreak: 'break-all', lineHeight: 1.5 }}>{command}</span>
      <button onClick={copy} title="Copy" style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: copied ? '#4ade80' : '#555', flexShrink: 0,
        transition: 'color 0.2s', padding: '2px 4px',
      }}
        onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = '#ccc' }}
        onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
      >
        {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
      </button>
    </div>
  )
}

function CliSetup() {
  const COMMANDS = [
    'pip install inventor-studio',
    'inventor-studio config set api-url <your-server-url>',
    'inventor-studio config set api-key <key-from-dashboard>',
    'inventor-studio dream "your invention idea"',
  ]
  return (
    <div className="terminal">
      <div className="terminal-bar">
        <div className="terminal-dot" style={{ background: '#ff5f57' }} />
        <div className="terminal-dot" style={{ background: '#ffbd2e' }} />
        <div className="terminal-dot" style={{ background: '#28c840' }} />
        <span style={{ marginLeft: 8, fontSize: 11, color: '#555', fontFamily: 'Kanit, sans-serif' }}>
          terminal
        </span>
      </div>
      <div className="terminal-body">
        {COMMANDS.map(cmd => <CopyLine key={cmd} command={cmd} />)}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 4 }}>
            <span className="terminal-line-cyan">⟳ Searching ArXiv, PubMed, Patents...</span>
          </div>
          <div style={{ marginBottom: 4 }}>
            <span className="terminal-line-gold">⟳ Dream agents awakening (3/3)</span>
          </div>
          <div style={{ marginBottom: 4 }}>
            <span className="terminal-line-output">  [ok] analogical  [ok] biomimicry  [ok] inversion</span>
          </div>
          <div style={{ marginBottom: 4 }}>
            <span className="terminal-line-output">  [ok] cross-domain [ok] historical  [ok] extreme</span>
          </div>
          <div style={{ marginBottom: 4 }}>
            <span className="terminal-line-cyan">⟳ Synthesizing...</span>
          </div>
          <div>
            <span className="terminal-line-gold">[ok] Invention saved → invention.json</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Welcome() {
  const navigate = useNavigate()
  const [concept, setConcept]     = useState('')
  const [mode, setMode]           = useState('dream')
  const [domain, setDomain]       = useState('hybrid')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [showDomain, setShowDomain] = useState(false)
  const [tiers, setTiers]         = useState<Tier[]>(DEFAULT_TIERS)
  const [showcase, setShowcase]   = useState<any[]>([])
  const [guestCount, setGuestCount] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('guest_inv_count') || '0', 10) } catch { return 0 }
  })
  const trialUsed = guestCount >= 1
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toast] = useState('')

  // ── Blast door state ────────────────────────────────────
  const [doorOpen, setDoorOpen]         = useState(false)
  const domainChosenRef                 = useRef(false)
  const widgetRef                       = useRef<HTMLDivElement | null>(null)
  const doorSoundRef                    = useRef<HTMLAudioElement | null>(null)

  // Preload door sound
  useEffect(() => {
    const audio = new Audio('/door.mp3')
    audio.preload = 'auto'
    audio.volume = 1
    audio.load()
    doorSoundRef.current = audio
  }, [])

  const playDoorSound = () => {
    const audio = doorSoundRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  const openDoor        = () => { setDoorOpen(true);  playDoorSound() }
  const closeDoor       = () => { setDoorOpen(false); playDoorSound() }
  const openDoorSilent  = () => setDoorOpen(true)
  const closeDoorSilent = () => setDoorOpen(false)
  // closeDoor / closeDoorSilent kept for parity with source even if not all used
  void closeDoor

  useEffect(() => {
    if (!widgetRef.current) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.25 && domainChosenRef.current) {
        openDoorSilent()
      } else if (entry.intersectionRatio < 0.1) {
        closeDoorSilent()
      }
    }, { threshold: [0, 0.1, 0.25, 0.5, 1] })
    obs.observe(widgetRef.current)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDomainSelect = (id: string) => {
    setDomain(id)
    setShowDomain(false)
    domainChosenRef.current = true
    openDoor()
  }

  const selectedDomain = DOMAINS.find(d => d.id === domain)!

  useEffect(() => {
    getSubscriptionSettings().then(({ data }) => {
      if (data?.subscriptions?.length) {
        const merged = DEFAULT_TIERS.map(def => {
          const dbTier = data.subscriptions.find((s: any) => s.tier === def.tier)
          return dbTier ? { ...def, price_inr: dbTier.price_inr } : def
        })
        setTiers(merged)
      }
    }).catch(() => {})
    getShowcase().then(({ data }) => {
      if (data?.inventions?.length) setShowcase(data.inventions)
    }).catch(() => {})
  }, [])

  const handleGuestDream = async () => {
    if (!concept.trim()) return setError('Enter a concept to invent')
    if (trialUsed) { setShowSignupPrompt(true); return }
    setError('')
    setLoading(true)
    try {
      const { data } = await startGuestDream(concept.trim())
      const newCount = data.used ?? guestCount + 1
      try { localStorage.setItem('guest_inv_count', String(newCount)) } catch {}
      setGuestCount(newCount)
      navigate(`/guest-stream/${data.inventionId}`, {
        state: {
          highVolume: data.highVolume ?? false,
          queuePosition: data.queue?.queued ?? 0,
          highVolumeMessage: data.highVolumeMessage ?? null,
        },
      })
    } catch (err: any) {
      if (err.response?.data?.guestLimitReached) {
        try { localStorage.setItem('guest_inv_count', '1') } catch {}
        setGuestCount(1)
        setShowSignupPrompt(true)
      } else {
        setError(err.response?.data?.message || 'Failed to start dream')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,8,12,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(59,130,246,0.4)' }}>
              <Zap size={18} color="#000" fill="#000" />
            </div>
            <div>
              <span style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 700, fontSize: 17, color: '#fff' }}>
                Inventor Studio
              </span>
              <span style={{ fontSize: 10, color: '#555', display: 'block', lineHeight: 1, fontWeight: 500 }}>
                product of KLabs
              </span>
            </div>
          </div>

          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <a href="#features" className="nav-link">Features</a>
            <a href="#download" className="nav-link">Download</a>
            <a href="#cli" className="nav-link">CLI</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="https://autopilot-wallet.gitbook.io/inventor-studio-docs" target="_blank" rel="noopener noreferrer" className="nav-link">Docs</a>
            <a href="/pitch-deck.html" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ color: 'var(--primary)', fontWeight: 600 }}>Investors</a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/login')}
              className="hide-mobile btn-ghost"
              style={{ padding: '8px 16px', fontSize: 14 }}>
              Sign In
            </button>
            <button onClick={() => navigate('/signup')}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: 14 }}>
              Get Started
            </button>
            <button className="hide-desktop"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 4 }}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="hide-desktop" style={{
            background: 'rgba(12,12,18,0.98)', borderTop: '1px solid var(--border)',
            padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <a href="#features" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#download" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Download</a>
            <a href="#cli" className="nav-link" onClick={() => setMobileMenuOpen(false)}>CLI</a>
            <a href="#pricing" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="https://autopilot-wallet.gitbook.io/inventor-studio-docs" target="_blank" rel="noopener noreferrer" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Docs</a>
            <a href="/pitch-deck.html" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ color: 'var(--primary)', fontWeight: 600 }} onClick={() => setMobileMenuOpen(false)}>Investors</a>
            <button onClick={() => navigate('/login')} className="btn-secondary" style={{ width: '100%', marginTop: 4 }}>Sign In</button>
          </div>
        )}
      </nav>

      {/* ── SHOWCASE STRIP ─────────────────────────────────── */}
      {showcase.length > 0 && (
        <div style={{
          borderBottom: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.2)',
          padding: '10px 0 8px',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '0 20px', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80',
                animation: 'neuralPulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, color: '#555', fontFamily: 'Kanit, sans-serif',
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Live Inventions
              </span>
            </div>
            <span style={{ fontSize: 10, color: '#333' }}>— click any to preview</span>
          </div>
          <div style={{
            display: 'flex', gap: 10, padding: '0 20px',
            overflowX: 'auto', scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }} className="hide-scrollbar">
            {showcase.map((inv: any) => (
              <button
                key={inv.id}
                onClick={() => navigate(`/showcase/${inv.id}`)}
                style={{
                  flexShrink: 0, width: 100,
                  background: 'rgba(18,18,26,0.9)',
                  border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 10px',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = ''
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{
                    fontSize: 9, fontFamily: 'Kanit, sans-serif', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: inv.domain === 'software' ? '#00d4ff'
                      : inv.domain === 'hardware' ? 'var(--primary)'
                      : inv.domain === 'life-science' ? '#4ade80'
                      : '#4ade80',
                    background: inv.domain === 'software' ? 'rgba(0,212,255,0.08)'
                      : inv.domain === 'hardware' ? 'rgba(59,130,246,0.08)'
                      : inv.domain === 'life-science' ? 'rgba(74,222,128,0.08)'
                      : 'rgba(74,222,128,0.08)',
                    padding: '2px 7px', borderRadius: 6,
                  }}>
                    {inv.domain || 'hybrid'}
                  </span>
                  <ArrowRight size={9} color="#333" />
                </div>
                <p style={{
                  fontSize: 10, fontFamily: 'Kanit, sans-serif', fontWeight: 700,
                  color: '#ddd', lineHeight: 1.3, marginBottom: 6,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {inv.title || inv.seedConcept}
                </p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { label: 'N', value: inv.noveltyScore,     color: 'var(--primary)' },
                    { label: 'F', value: inv.feasibilityScore, color: '#00d4ff' },
                    { label: 'I', value: inv.impactScore,      color: '#4ade80' },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 8, color: '#444', fontFamily: 'Kanit, sans-serif' }}>{s.label}</span>
                        <span style={{ fontSize: 8, color: '#555', fontFamily: 'Kanit, sans-serif' }}>
                          {Math.round((s.value || 0) * 100)}
                        </span>
                      </div>
                      <div style={{ height: 2, background: 'var(--border)', borderRadius: 2 }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          background: s.color,
                          width: `${(s.value || 0) * 100}%`,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── HERO ───────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1200, margin: '0 auto', padding: `${showcase.length > 0 ? '28px' : '72px'} 24px 64px`,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 60, alignItems: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 30% 50%, rgba(59,130,246,0.07) 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80',
              animation: 'neuralPulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, fontFamily: 'Kanit, sans-serif' }}>
              ASI-1 · Ready to Dream
            </span>
          </div>

          <h1 style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 800,
            fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', lineHeight: 1.05,
            color: '#fff', marginBottom: 12 }}>
            World's First<br />
            <span className="gradient-text">Artificial Super</span><br />
            <span className="gradient-text">Intelligence</span>
          </h1>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: 12, padding: '8px 16px', marginBottom: 20 }}>
            <span style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 800, fontSize: 20,
              color: 'var(--primary)', letterSpacing: '0.05em' }}>BRAHMA ASI</span>
            <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>— the Dreamer</span>
          </div>

          <p style={{ fontSize: 16, color: '#888', lineHeight: 1.7, marginBottom: 16, maxWidth: 480 }}>
            10 AI agents dream up novel inventions across software, hardware, and life sciences —
            then generate a complete MVP spec, build guide, and cost breakdown. Ready to build.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 20, padding: '5px 12px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80',
                animation: 'neuralPulse 1.5s infinite' }} />
              <span style={{ fontSize: 12, fontFamily: 'Kanit, sans-serif', fontWeight: 700, color: 'var(--primary)' }}>
                BRAHMA ASI
              </span>
              <span style={{ fontSize: 11, color: '#555' }}>Dreams · Live Now</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)',
              borderRadius: 20, padding: '5px 12px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#555' }} />
              <span style={{ fontSize: 12, fontFamily: 'Kanit, sans-serif', fontWeight: 700, color: '#00d4ff', opacity: 0.6 }}>
                VISHNU ASI
              </span>
              <span style={{ fontSize: 11, color: '#444' }}>Preserves · Coming</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.12)',
              borderRadius: 20, padding: '5px 12px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#555' }} />
              <span style={{ fontSize: 12, fontFamily: 'Kanit, sans-serif', fontWeight: 700, color: '#a78bfa', opacity: 0.6 }}>
                SHIVA ASI
              </span>
              <span style={{ fontSize: 11, color: '#444' }}>Transforms · Coming</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 36 }}>
            {['10 Dream Agents', 'ArXiv + PubMed', 'USPTO Patents', 'Real-time Stream', 'PDF Export'].map(f => (
              <span key={f} className="chip chip-gray">{f}</span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/signup')} className="btn-primary"
              style={{ padding: '12px 28px', fontSize: 15, gap: 8 }}>
              Start Free <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate('/login')} className="btn-secondary"
              style={{ padding: '12px 24px', fontSize: 15 }}>
              Sign In
            </button>
          </div>

          <p style={{ marginTop: 16, fontSize: 13, color: '#444' }}>
            1 free guest invention · No credit card · No signup required
          </p>
        </div>

        {/* Right: Dream widget */}
        <div ref={widgetRef} style={{ position: 'relative' }}>
        {/* ── Blast door overlay ───────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20,
          overflow: 'hidden', zIndex: 20,
          pointerEvents: doorOpen ? 'none' : 'auto',
          cursor: doorOpen ? 'default' : 'pointer',
        }} onClick={() => { if (!doorOpen) handleDomainSelect(domain) }}>

          {!doorOpen && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 22, pointerEvents: 'none',
              fontFamily: 'Kanit, sans-serif', fontWeight: 900,
              fontSize: 15, color: '#ffe04a',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              textShadow: '0 0 12px rgba(255,210,0,0.9), 0 0 28px rgba(255,180,0,0.6), 0 2px 8px #000',
              animation: 'doorBlink 1.1s ease-in-out infinite',
              whiteSpace: 'nowrap',
            }}>
              CLICK ME
            </div>
          )}

          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: '50%',
            backgroundImage: 'url(/sci-door.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
            borderRight: '3px solid rgba(200,140,0,0.9)',
            boxShadow: '6px 0 32px rgba(200,140,0,0.35), inset -2px 0 8px rgba(0,0,0,0.6)',
            transform: doorOpen ? 'translateX(-101%)' : 'translateX(0)',
            transition: 'transform 0.85s cubic-bezier(0.77,0,0.18,1)',
          }} />

          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%',
            backgroundImage: 'url(/sci-door.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
            borderLeft: '3px solid rgba(200,140,0,0.9)',
            boxShadow: '-6px 0 32px rgba(200,140,0,0.35), inset 2px 0 8px rgba(0,0,0,0.6)',
            transform: doorOpen ? 'translateX(101%) scaleX(-1)' : 'scaleX(-1)',
            transition: 'transform 0.85s cubic-bezier(0.77,0,0.18,1) 0.07s',
          }} />

        </div>

        <div style={{
          background: 'rgba(18,18,26,0.9)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 28, backdropFilter: 'blur(10px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, color: '#555', fontFamily: 'Kanit, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              ASI-1 · Ready to Dream
            </p>
            <h2 style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 700, fontSize: 22, color: '#fff' }}>
              What shall we <span className="gradient-text">invent</span> today?
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { id: 'dream',  label: 'Dream',  sub: 'Free explore' },
              { id: 'invent', label: 'Invent', sub: 'Goal-directed' },
              { id: 'evolve', label: 'Evolve', sub: 'Improve idea' },
            ].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                flex: 1, borderRadius: 12, padding: '10px 8px', textAlign: 'left',
                border: `1px solid ${mode === m.id ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                background: mode === m.id ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <p style={{ fontFamily: 'Kanit, sans-serif', fontSize: 13, fontWeight: 700,
                  color: mode === m.id ? 'var(--primary)' : '#fff', marginBottom: 2 }}>{m.label}</p>
                <p style={{ fontSize: 11, color: '#555' }}>{m.sub}</p>
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: '#555', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Domain</p>
            <button onClick={() => setShowDomain(!showDomain)} style={{
              width: '100%', background: 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: 12,
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', transition: 'border-color 0.15s',
            }}>
              <selectedDomain.icon size={16} style={{ color: selectedDomain.color, flexShrink: 0 }} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ fontFamily: 'Kanit, sans-serif', fontSize: 13, fontWeight: 600,
                  color: '#fff', marginBottom: 1 }}>{selectedDomain.label}</p>
                <p style={{ fontSize: 11, color: '#555' }}>{selectedDomain.hint}</p>
              </div>
              <ChevronDown size={14} color="#555"
                style={{ transform: showDomain ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
            </button>
            {showDomain && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {DOMAINS.map(d => (
                  <button key={d.id} onClick={() => handleDomainSelect(d.id)} style={{
                    width: '100%', background: domain === d.id ? 'var(--border)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${domain === d.id ? 'rgba(255,255,255,0.12)' : 'var(--muted)'}`,
                    borderRadius: 10, padding: '10px 14px', display: 'flex',
                    alignItems: 'center', gap: 10, cursor: 'pointer',
                  }}>
                    <d.icon size={14} style={{ color: d.color }} />
                    <span style={{ fontFamily: 'Kanit, sans-serif', fontSize: 13, color: '#ccc', fontWeight: 600 }}>{d.label}</span>
                    <span style={{ fontSize: 11, color: '#555', marginLeft: 4 }}>{d.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: '#555', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Your Concept</p>
            <textarea
              value={concept}
              onChange={e => setConcept(e.target.value)}
              placeholder="Describe what you want to invent... Be bold, specific, or vague — the ASI explores it all."
              className="input-field"
              rows={4}
              style={{ resize: 'none', fontFamily: 'Poppins, sans-serif', fontSize: 14, lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setConcept(ex)} style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 8,
                background: 'var(--muted)', border: '1px solid var(--border)',
                color: '#666', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.borderColor = 'var(--border)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                {ex.length > 36 ? ex.slice(0, 36) + '…' : ex}
              </button>
            ))}
          </div>

          {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          {!trialUsed && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12, padding: '8px 12px', borderRadius: 10,
              background: 'var(--muted)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: '#555' }}>Guest uses remaining</span>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0].map(i => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: i < (1 - guestCount) ? 'var(--primary)' : 'var(--border)',
                    boxShadow: i < (1 - guestCount) ? '0 0 6px rgba(59,130,246,0.5)' : 'none',
                    transition: 'all 0.3s',
                  }} />
                ))}
                <span style={{ fontSize: 11, color: '#888', marginLeft: 4, fontFamily: 'Kanit, sans-serif', fontWeight: 700 }}>
                  {Math.max(0, 1 - guestCount)}/1
                </span>
              </div>
            </div>
          )}

          {trialUsed ? (
            <div>
              <button onClick={() => setShowSignupPrompt(true)} className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 15, marginBottom: 8 }}>
                Create Free Account to Continue <ArrowRight size={16} />
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#555' }}>
                Free guest invention used · Sign up for 3 more
              </p>
            </div>
          ) : (
            <button onClick={handleGuestDream} disabled={loading || !concept.trim()}
              className="btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: 15, display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? (
                <><span className="spinner" /> Starting Dream Loop...</>
              ) : (
                <><Send size={16} /> Try Free — No Account Needed</>
              )}
            </button>
          )}

          <p style={{ textAlign: 'center', fontSize: 11, color: '#444', marginTop: 10 }}>
            1 free invention · No signup required
          </p>
        </div>
        </div>{/* end widgetRef wrapper */}
      </section>

      <hr className="section-divider" />

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 24px' }}>
        <ConsciousnessConsole />

        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <span className="chip chip-cyan" style={{ marginBottom: 16, display: 'inline-block' }}>Capabilities</span>
          <h2 style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 800,
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#fff', marginBottom: 14 }}>
            Not a chatbot. An <span className="gradient-text">invention engine.</span>
          </h2>
          <p style={{ color: '#666', fontSize: 16, maxWidth: 540, margin: '0 auto' }}>
            10 AI agents with distinct cognitive lenses work in parallel to generate
            inventions that no single model would imagine.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="glass-card"
              style={{ padding: 24, transition: 'border-color 0.2s, transform 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = '' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12,
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon size={20} color="var(--primary)" />
              </div>
              <h3 style={{ fontFamily: 'Kanit, sans-serif', fontSize: 16, fontWeight: 700,
                color: '#fff', marginBottom: 8 }}>{label}</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="section-divider" />

      {/* ── DOWNLOAD SECTION ───────────────────────────────── */}
      <section id="download" style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span className="chip chip-cyan" style={{ marginBottom: 16, display: 'inline-block' }}>Desktop Client</span>
          <h2 style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 800,
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#fff', marginBottom: 14 }}>
            Install on any <span className="gradient-text">platform.</span>
          </h2>
          <p style={{ color: '#666', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
            Native desktop app powered by Electron — connects to the Inventor Studio server
            at <code style={{ color: 'var(--primary)', background: 'rgba(59,130,246,0.08)',
              padding: '2px 7px', borderRadius: 6, fontSize: 13 }}>klabs.network</code>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, maxWidth: 900, margin: '0 auto' }}>
        {[
          {
            label: 'Windows', sub: 'Windows 10 / 11 · x64', detail: 'Setup installer — installs with Start Menu shortcut',
            ext: '.exe',
            accent: '#00adef', accentRgb: '0,173,239',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 5.5L11 4v8H3V5.5zM13 4l8 1.5V12h-8V4zM3 13h8v7.5L3 19V13zM13 13h8v6l-8 1.5V13z" fill="#00adef"/></svg>,
          },
          {
            label: 'macOS', sub: 'macOS 12+ · Apple Silicon & Intel', detail: 'DMG drag-and-drop install',
            ext: '.dmg',
            accent: '#aaaaaa', accentRgb: '170,170,170',
            icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#aaa"/></svg>,
          },
          {
            label: 'Ubuntu / Linux', sub: 'Ubuntu 20.04+ · Debian · Arch', detail: 'AppImage — runs without install',
            ext: '.AppImage',
            accent: '#e95420', accentRgb: '233,84,32',
            icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#e95420" strokeWidth="1.5"/><circle cx="12" cy="12" r="4" fill="#e95420"/><circle cx="12" cy="4.5" r="1.8" fill="#e95420"/><circle cx="4.5" cy="17.5" r="1.8" fill="#e95420"/><circle cx="19.5" cy="17.5" r="1.8" fill="#e95420"/></svg>,
          },
        ].map(p => (
          <div key={p.label}
            style={{
              display: 'flex', flexDirection: 'column', gap: 16,
              background: 'rgba(18,18,26,0.9)',
              border: `1px solid rgba(${p.accentRgb},0.15)`,
              borderRadius: 18, padding: '28px 24px',
              opacity: 0.6, cursor: 'not-allowed',
              position: 'relative', overflow: 'hidden',
            }}>
            <div style={{
              position: 'absolute', top: 14, right: -22,
              background: 'var(--primary)', color: '#000',
              fontSize: 9, fontWeight: 800, fontFamily: 'Kanit, sans-serif',
              padding: '3px 32px', transform: 'rotate(35deg)',
              letterSpacing: '0.08em',
            }}>SOON</div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14,
                background: `rgba(${p.accentRgb},0.08)`, border: `1px solid rgba(${p.accentRgb},0.15)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5,
                background: `rgba(${p.accentRgb},0.1)`,
                border: `1px solid rgba(${p.accentRgb},0.25)`,
                borderRadius: 20, padding: '4px 10px' }}>
                <span style={{ fontSize: 10, color: p.accent, fontWeight: 700, fontFamily: 'Kanit, sans-serif' }}>{p.ext}</span>
              </div>
            </div>

            <div>
              <h3 style={{ fontFamily: 'Kanit, sans-serif', fontSize: 20, fontWeight: 700,
                color: '#fff', marginBottom: 6 }}>{p.label}</h3>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                {p.sub}<br />{p.detail}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
              paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <Clock size={14} color="#444" />
              <span style={{ fontSize: 13, color: '#444', fontFamily: 'Kanit, sans-serif', fontWeight: 600 }}>
                Coming Soon
              </span>
            </div>
          </div>
        ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 13, color: '#444' }}>
            v1.0.0 · Free download · Connects to&nbsp;
            <code style={{ color: 'var(--primary)', background: 'rgba(59,130,246,0.08)',
              padding: '1px 6px', borderRadius: 5, fontSize: 12 }}>
              klabs.network
            </code>
          </p>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ── CLI / PIP SECTION ──────────────────────────────── */}
      <section id="cli" style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 52, alignItems: 'center' }}>

          <div>
            <span className="chip chip-gold" style={{ marginBottom: 20, display: 'inline-block' }}>Developer Access</span>
            <h2 style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', color: '#fff', marginBottom: 18, lineHeight: 1.1 }}>
              Invent from your<br /><span className="gradient-text-cyan">terminal.</span>
            </h2>
            <p style={{ color: '#666', fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>
              The <code style={{ color: 'var(--primary)', background: 'rgba(59,130,246,0.1)',
                padding: '2px 6px', borderRadius: 6, fontSize: 14 }}>inventor-studio</code> pip
              package gives you full API access. Pipe inventions into your codebase, CI/CD pipelines,
              or scripts.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'Stream live invention output to your terminal',
                'Save results as JSON, Markdown, or PDF',
                'Integrate with any Python workflow',
                'Available on PyPI — install in seconds',
              ].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={11} color="#00d4ff" />
                  </div>
                  <span style={{ fontSize: 14, color: '#888' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <CliSetup />

            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 11, color: '#444', textTransform: 'uppercase',
                letterSpacing: '0.1em', fontWeight: 600, marginBottom: 10,
                fontFamily: 'Kanit, sans-serif' }}>
                Download Desktop Client
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                {[
                  {
                    href: '/downloads/inventor-studio-setup.exe',
                    download: true,
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M3 5.5L11 4v8H3V5.5zM13 4l8 1.5V12h-8V4zM3 13h8v7.5L3 19V13zM13 13h8v6l-8 1.5V13z" fill="#00adef"/>
                      </svg>
                    ),
                    label: 'Windows',
                    sub: '.exe setup',
                    accent: '#00adef',
                  },
                  {
                    href: '/downloads/inventor-studio.dmg',
                    download: true,
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#555"/>
                      </svg>
                    ),
                    label: 'macOS',
                    sub: '.dmg installer',
                    accent: '#888',
                  },
                  {
                    href: '/downloads/inventor-studio.AppImage',
                    download: true,
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#e95420" strokeWidth="1.5"/>
                        <path d="M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0z" fill="#e95420"/>
                      </svg>
                    ),
                    label: 'Ubuntu',
                    sub: '.AppImage · Linux',
                    accent: '#e95420',
                  },
                  {
                    href: 'https://pypi.org/project/inventor-studio',
                    target: '_blank' as const,
                    icon: <Package size={18} color="#888" />,
                    label: 'pip install',
                    sub: 'Python CLI',
                    accent: '#4ade80',
                  },
                ].map((btn: any) => (
                  <a key={btn.label}
                    href={btn.href}
                    {...(btn.download ? { download: true } : {})}
                    {...(btn.target ? { target: btn.target, rel: 'noopener noreferrer' } : {})}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 12, padding: '11px 14px',
                      textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = btn.accent + '55'
                      e.currentTarget.style.background = btn.accent + '08'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--muted)'
                    }}>
                    <span style={{ flexShrink: 0 }}>{btn.icon}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#ccc',
                        fontFamily: 'Kanit, sans-serif', whiteSpace: 'nowrap' }}>{btn.label}</p>
                      <p style={{ fontSize: 10, color: '#444', whiteSpace: 'nowrap' }}>{btn.sub}</p>
                    </div>
                    <Download size={12} color="#444" style={{ flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ── PRICING ────────────────────────────────────────── */}
      <section id="pricing" style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <span className="chip chip-gold" style={{ marginBottom: 16, display: 'inline-block' }}>Pricing</span>
          <h2 style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 800,
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#fff', marginBottom: 14 }}>
            Start free, scale as you <span className="gradient-text">invent.</span>
          </h2>
          <p style={{ color: '#666', fontSize: 16 }}>
            All plans require admin approval · Admin activates subscriptions
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '20px 28px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontFamily: 'Kanit, sans-serif', fontSize: 18, color: '#fff', fontWeight: 700, marginBottom: 4 }}>
              Free — Get Started
            </h3>
            <p style={{ fontSize: 13, color: '#555' }}>1 free guest invention · 3 more after signup</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {['1 free guest try', 'PDF export', 'MVP generator', 'No credit card'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={12} color="#4ade80" />
                <span style={{ fontSize: 13, color: '#666' }}>{f}</span>
              </div>
            ))}
            <button onClick={() => navigate('/signup')} className="btn-primary"
              style={{ padding: '9px 20px', fontSize: 13 }}>
              Create Account
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {tiers.map(tier => {
            const c = TIER_COLORS[tier.tier] || TIER_COLORS.tier1
            const isPop = tier.popular
            const featureList: string[] = Array.isArray(tier.features)
              ? tier.features
              : (typeof tier.features === 'string' ? JSON.parse(tier.features) : [])
            return (
              <div key={tier.tier} className={`pricing-card ${isPop ? 'popular' : ''}`}
                style={{ border: `1px solid ${isPop ? c.border : 'var(--border)'}`,
                  background: isPop ? c.bg : 'var(--bg-dark)' }}>
                {isPop && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    background: '#00d4ff', color: '#000', fontSize: 10, fontWeight: 800,
                    letterSpacing: '0.1em', padding: '4px 14px', borderRadius: 20,
                    fontFamily: 'Kanit, sans-serif', whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ padding: '28px 24px 20px', borderBottom: `1px solid ${c.border}` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg,
                    border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', marginBottom: 14 }}>
                    <Star size={20} style={{ color: c.accent }} strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontFamily: 'Kanit, sans-serif', fontSize: 20, fontWeight: 700,
                    color: c.accent, marginBottom: 8 }}>{tier.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: 'Kanit, sans-serif', fontSize: 36, fontWeight: 800, color: '#fff' }}>
                      ₹{tier.price_inr?.toLocaleString('en-IN')}
                    </span>
                    <span style={{ color: '#555', fontSize: 13 }}>/month</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#555', marginTop: 6 }}>
                    {tier.invention_limit === 0 ? 'Unlimited inventions' : `${tier.invention_limit} inventions`}
                  </p>
                </div>
                <div style={{ padding: '20px 24px', flex: 1 }}>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {featureList.map((f: string) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                        fontSize: 13, color: '#888' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: c.bg,
                          border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <Check size={10} style={{ color: c.accent }} strokeWidth={3} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                  <button onClick={() => navigate('/signup')} style={{
                    width: '100%', padding: '11px 0', borderRadius: 12, fontWeight: 600,
                    fontSize: 14, border: `1.5px solid ${c.accent}`,
                    background: isPop ? c.accent : 'transparent',
                    color: isPop ? '#000' : c.accent, cursor: 'pointer',
                    fontFamily: 'Kanit, sans-serif', transition: 'all 0.15s',
                  }}>
                    Get {tier.name}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '40px 24px',
        background: 'rgba(0,0,0,0.3)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="#000" fill="#000" />
            </div>
            <div>
              <span style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 700, fontSize: 15, color: '#ccc' }}>
                Inventor Studio
              </span>
              <span style={{ fontSize: 11, color: '#444', display: 'block' }}>product of KLabs</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <a href="#features" className="nav-link" style={{ fontSize: 13 }}>Features</a>
            <a href="#download" className="nav-link" style={{ fontSize: 13 }}>Download</a>
            <a href="#cli" className="nav-link" style={{ fontSize: 13 }}>CLI</a>
            <a href="#pricing" className="nav-link" style={{ fontSize: 13 }}>Pricing</a>
            <a href="https://autopilot-wallet.gitbook.io/inventor-studio-docs" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ fontSize: 13 }}>Docs</a>
            <a href="/pitch-deck.html" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>Investors</a>
            <Link to="/login" className="nav-link" style={{ fontSize: 13 }}>Sign In</Link>
            <Link to="/signup" className="nav-link" style={{ fontSize: 13 }}>Get Started</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <a href="mailto:support@klabs.network" style={{ fontSize: 12, color: '#555', textDecoration: 'none' }}
              onMouseOver={e => ((e.target as HTMLElement).style.color='var(--primary)')} onMouseOut={e => ((e.target as HTMLElement).style.color='#555')}>
              support@klabs.network
            </a>
            <p style={{ fontSize: 12, color: '#333', margin: 0 }}>
              © {new Date().getFullYear()} KLabs · Inventor Studio ASI-1
            </p>
          </div>
        </div>
      </footer>

      {/* ── TOAST ──────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a26', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 12, padding: '12px 20px', zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          animation: 'fadeIn 0.2s ease-out',
          whiteSpace: 'nowrap',
        }}>
          <Clock size={15} color="var(--primary)" />
          <span style={{ fontSize: 13, color: '#ccc', fontFamily: 'Poppins, sans-serif' }}>{toast}</span>
        </div>
      )}

      {/* ── SIGNUP PROMPT MODAL ─────────────────────────────── */}
      {showSignupPrompt && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ background: '#12121a', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 20, padding: 36, maxWidth: 420, width: '100%',
            boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(59,130,246,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Zap size={26} color="var(--primary)" />
              </div>
              <h2 style={{ fontFamily: 'Kanit, sans-serif', fontSize: 22, fontWeight: 700,
                color: '#fff', marginBottom: 10 }}>Free invention used!</h2>
              <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>
                Create a free account to get <strong style={{ color: 'var(--primary)' }}>3 inventions</strong> saved
                to your profile — no credit card required.
              </p>
            </div>
            <button onClick={() => navigate('/signup')} className="btn-primary"
              style={{ width: '100%', padding: 14, fontSize: 15, marginBottom: 10 }}>
              Create Free Account <ArrowRight size={16} />
            </button>
            <button onClick={() => setShowSignupPrompt(false)} className="btn-ghost"
              style={{ width: '100%', fontSize: 14 }}>
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
