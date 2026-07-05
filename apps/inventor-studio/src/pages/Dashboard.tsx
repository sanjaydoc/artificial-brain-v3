import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, Brain, Cpu, FlaskConical, Dna, Send, History,
  ChevronDown, Key, Copy, RefreshCw, Trash2, Check, Terminal, Rocket,
  MessageSquare, Code2, Sparkles, Target, GitMerge, ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { AppHeader } from '@/components/AppHeader'

const startDream = (concept: string, mode = 'dream', domain = 'hybrid', agentCount = 10) =>
  api.post('/dream', { concept, mode, domain, agentCount })
const generateApiKey = () => api.post('/auth/api-key')
const getApiKeyStatus = () => api.get('/auth/api-key')
const revokeApiKey = () => api.delete('/auth/api-key')

const TIER_LIMITS: Record<string, number> = { free: 3, tier1: 15, tier2: 50, tier3: 0 }
const TIER_LABELS: Record<string, string> = {
  free: 'Free', tier1: 'Explorer', tier2: 'Innovator', tier3: 'Visionary',
}

const DOMAINS = [
  { id: 'software',     label: 'Software',     icon: Brain,        color: 'text-primary',    hint: 'Algorithms, systems, code, AI' },
  { id: 'hardware',     label: 'Hardware',      icon: Cpu,          color: 'text-blue-400',   hint: 'Circuits, mechanics, IoT, materials' },
  { id: 'life-science', label: 'Life Science',  icon: FlaskConical, color: 'text-green-500',  hint: 'Proteins, drugs, biotech, genes' },
  { id: 'cell-therapy', label: 'Cell Therapy',  icon: Dna,          color: 'text-pink-500',   hint: 'Stem cells, genetic engineering, iPSC' },
  { id: 'hybrid',       label: 'Hybrid',        icon: Zap,          color: 'text-purple-500', hint: 'Cross-domain invention' },
]

const EXAMPLES = [
  'Self-healing material that repairs like human skin',
  'Brain-computer interface powered by quantum dots',
  'Enzyme that breaks down ocean plastic in 24 hours',
  'Zero-latency mesh network using atmospheric plasma',
  'Photosynthesis chip that makes food and electricity',
  'Protein that selectively destroys cancer stem cells',
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, refresh } = useAuth()

  const u: any = user
  const tier = 'tier3'
  const limit = 0
  const used = 0
  const limitHit = false
  const canAccessPremium = true

  const [concept, setConcept]       = useState('')
  const [mode, setMode]             = useState('dream')
  const [domain, setDomain]         = useState('hybrid')
  const [agentCount, setAgentCount] = useState(10)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [showDomain, setShowDomain] = useState(false)

  const [showApiKey, setShowApiKey]       = useState(false)
  const [apiKey, setApiKey]               = useState<string | null>(null)
  const [apiKeyPrefix, setApiKeyPrefix]   = useState<string | null>(null)
  const [apiKeyLoading, setApiKeyLoading] = useState(false)
  const [copied, setCopied]               = useState(false)

  useEffect(() => {
    getApiKeyStatus().then(({ data }) => {
      if (data.hasApiKey) setApiKeyPrefix(data.prefix)
    }).catch(() => {})
  }, [])

  const selectedDomain = DOMAINS.find(d => d.id === domain)!

  const handleDream = async () => {
    if (!concept.trim()) return setError('Enter a concept to invent')
    setError('')
    setLoading(true)
    try {
      const { data } = await startDream(concept.trim(), mode, domain, agentCount)
      navigate(`/stream/${data.inventionId}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start dream session')
      setLoading(false)
    }
  }

  const handleExample = (ex: string) => setConcept(ex)

  const handleGenerateApiKey = async () => {
    setApiKeyLoading(true)
    try {
      const { data } = await generateApiKey()
      setApiKey(data.apiKey)
      setApiKeyPrefix(data.prefix)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to generate API key')
    } finally {
      setApiKeyLoading(false)
    }
  }

  const handleRevokeApiKey = async () => {
    setApiKeyLoading(true)
    try {
      await revokeApiKey()
      setApiKey(null)
      setApiKeyPrefix(null)
    } catch {} finally {
      setApiKeyLoading(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {/* Welcome section */}
        <div className="animate-fadeIn">
          <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-3">Dashboard</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            What shall we <span className="gradient-text">invent</span> today?
          </h1>
          <p className="mt-2 text-muted-foreground">
            ASI-1 is ready to dream. Pick a mode, choose a domain, and describe your concept.
          </p>
        </div>

        {/* Quick links row */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          <button onClick={() => navigate('/inventions')}
            className="rounded-xl bg-card border border-border p-4 text-left transition-colors hover:border-primary/40">
            <div className="h-10 w-10 rounded-lg grid place-items-center bg-primary/10 border border-primary/20 mb-3">
              <History className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">My Inventions</h3>
            <p className="mt-1 text-sm text-muted-foreground">Browse past dream sessions and results</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-primary">Open inventions →</p>
          </button>

          <button onClick={() => navigate('/chat')}
            className="rounded-xl bg-card border border-border p-4 text-left transition-colors hover:border-primary/40">
            <div className="h-10 w-10 rounded-lg grid place-items-center bg-primary/10 border border-primary/20 mb-3">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Chat with ASI</h3>
            <p className="mt-1 text-sm text-muted-foreground">Conversational AI for brainstorming</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-primary">Open chat →</p>
          </button>

          <button onClick={() => canAccessPremium ? navigate('/vibe') : navigate('/upgrade')}
            className="rounded-xl bg-card border border-border p-4 text-left transition-colors hover:border-primary/40">
            <div className="h-10 w-10 rounded-lg grid place-items-center bg-primary/10 border border-primary/20 mb-3">
              <Code2 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Vibe Coding</h3>
            <p className="mt-1 text-sm text-muted-foreground">AI pair-coder for prototyping</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-primary">Open vibe →</p>
          </button>

          <button onClick={() => canAccessPremium ? navigate('/electronics') : navigate('/upgrade')}
            className="rounded-xl bg-card border border-border p-4 text-left transition-colors hover:border-primary/40">
            <div className="h-10 w-10 rounded-lg grid place-items-center bg-primary/10 border border-primary/20 mb-3">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Electronics</h3>
            <p className="mt-1 text-sm text-muted-foreground">Circuit design & robotics</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-primary">Open electronics →</p>
          </button>
        </div>

        {/* Main dream form */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Mode + Domain + Agents */}
          <div className="space-y-6 animate-fadeIn">
            {/* Mode selection */}
            <div className="rounded-xl bg-card border border-border p-4">
              <label className="block text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3 font-semibold">Mode</label>
              <div className="space-y-2">
                {[
                  { id: 'dream',  label: 'Dream',  sub: 'Free explore',  icon: Sparkles },
                  { id: 'invent', label: 'Invent', sub: 'Goal-directed', icon: Target },
                  { id: 'evolve', label: 'Evolve', sub: 'Improve idea',  icon: GitMerge },
                ].map(m => {
                  const active = mode === m.id
                  return (
                    <button key={m.id} onClick={() => setMode(m.id)}
                      className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all border ${
                        active
                          ? 'border-primary/30 bg-primary/[0.06]'
                          : 'border-border hover:border-primary/20'
                      }`}>
                      <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${active ? 'bg-primary/15' : 'bg-muted'}`}>
                        <m.icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.sub}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Domain selection */}
            <div className="rounded-xl bg-card border border-border p-4">
              <label className="block text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3 font-semibold">Domain</label>
              <button onClick={() => setShowDomain(!showDomain)}
                className="w-full rounded-xl border border-border p-3 flex items-center gap-3 text-left hover:border-primary/20 transition-all">
                <selectedDomain.icon className={`w-5 h-5 ${selectedDomain.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{selectedDomain.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedDomain.hint}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${showDomain ? 'rotate-180' : ''}`} />
              </button>
              {showDomain && (
                <div className="mt-2 space-y-1.5 animate-slideUp">
                  {DOMAINS.map(d => {
                    const domainLocked = d.id === 'cell-therapy' && !canAccessPremium
                    return (
                      <button key={d.id}
                        onClick={() => { if (!domainLocked) { setDomain(d.id); setShowDomain(false) } else navigate('/upgrade') }}
                        className={`w-full rounded-xl border p-2.5 flex items-center gap-3 text-left transition-all ${
                          domain === d.id ? 'border-primary/30 bg-primary/[0.04]' : domainLocked ? 'border-border opacity-50' : 'border-border hover:border-primary/20'
                        }`}>
                        <d.icon className={`w-4 h-4 ${domainLocked ? 'text-muted-foreground' : d.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${domainLocked ? 'text-muted-foreground' : 'text-foreground'}`}>{d.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{d.hint}</p>
                        </div>
                        {domainLocked && (
                          <span className="text-[9px] text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 font-bold tracking-wide shrink-0">INNOVATOR+</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Agent count */}
            <div className="rounded-xl bg-card border border-border p-4">
              <label className="block text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3 font-semibold">Agents</label>
              <div className="flex gap-2">
                {[2, 3, 5, 10].map(n => (
                  <button key={n} onClick={() => setAgentCount(n)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                      agentCount === n
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{agentCount} reasoning agents will analyze your concept</p>
            </div>
          </div>

          {/* Right column — Concept textarea + action */}
          <div className="lg:col-span-2 space-y-5 animate-fadeIn">
            <div className="rounded-xl bg-card border border-border p-4 flex flex-col" style={{ minHeight: 340 }}>
              <label className="block text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3 font-semibold">Your Concept</label>
              <textarea
                value={concept}
                onChange={e => setConcept(e.target.value)}
                placeholder="Describe what you want to invent... Be bold, be specific, or be vague — the ASI will explore it."
                className="input-field flex-1 resize-none min-h-[160px] leading-relaxed"
              />

              {error && (
                <p className="text-destructive text-sm flex items-center gap-2 mt-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" /> {error}
                </p>
              )}

              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Try an example</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map(ex => (
                    <button key={ex} onClick={() => handleExample(ex)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-all text-left border border-border hover:border-primary/30">
                      {ex.length > 45 ? ex.slice(0, 45) + '...' : ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {limitHit && (
              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                <p className="text-sm text-destructive mb-1.5">
                  You've used all {limit} inventions on the <strong>{TIER_LABELS[tier]}</strong> plan.
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Upgrade your subscription to keep inventing.
                </p>
                <button onClick={() => navigate('/upgrade')}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors">
                  <Rocket className="w-3.5 h-3.5" /> View Upgrade Plans
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button onClick={handleDream} disabled={loading || !concept.trim() || limitHit}
              className="btn-primary w-full py-4 text-base flex items-center justify-center gap-3">
              {loading ? (
                <><span className="spinner" /> Starting Dream Loop...</>
              ) : (
                <><Send className="w-5 h-5" /> Start Dreaming</>
              )}
            </button>

            {/* API Key section removed */}
          </div>
        </div>
      </main>
    </div>
  )
}
