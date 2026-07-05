import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon, Eye, EyeOff, Check, X, Save, Key, Shield,
  CreditCard, Phone, Cloud, Zap, Globe, Loader2
} from 'lucide-react'
import { api } from '../lib/api'
import { AppHeader } from '../components/AppHeader'

/* ── Provider definitions ─────────────────────────────────── */

interface ProviderField {
  key: string
  label: string
  placeholder?: string
}

interface Provider {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  fields: ProviderField[]
  testProvider?: string
}

const LLM_PROVIDERS: Provider[] = [
  {
    id: 'openrouter', name: 'OpenRouter', description: 'Multi-model gateway (Llama, Mistral, Claude, GPT)',
    icon: <Zap className="w-5 h-5 text-violet-500" />,
    fields: [{ key: 'openrouter_api_key', label: 'API Key', placeholder: 'sk-or-...' }],
    testProvider: 'openrouter',
  },
  {
    id: 'anthropic', name: 'Anthropic (Claude)', description: 'Claude API direct access',
    icon: <Zap className="w-5 h-5 text-amber-500" />,
    fields: [{ key: 'anthropic_api_key', label: 'API Key', placeholder: 'sk-ant-...' }],
  },
  {
    id: 'openai', name: 'OpenAI', description: 'GPT-4o, o1, embeddings, DALL-E',
    icon: <Zap className="w-5 h-5 text-emerald-500" />,
    fields: [{ key: 'openai_api_key', label: 'API Key', placeholder: 'sk-proj-...' }],
  },
  {
    id: 'nvidia', name: 'NVIDIA NIM', description: 'GPU-accelerated inference',
    icon: <Zap className="w-5 h-5 text-green-500" />,
    fields: [{ key: 'nvidia_api_key', label: 'API Key', placeholder: 'nvapi-...' }],
  },
  {
    id: 'huggingface', name: 'Hugging Face', description: 'Open-source model hub + inference API',
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    fields: [{ key: 'huggingface_api_key', label: 'API Key', placeholder: 'hf_...' }],
  },
  {
    id: 'ollama', name: 'Ollama Tunnel', description: 'Self-hosted LLM via Cloudflare tunnel',
    icon: <Cloud className="w-5 h-5 text-sky-500" />,
    fields: [
      { key: 'ollama_tunnel_url', label: 'Tunnel URL', placeholder: 'https://ollama.example.com' },
      { key: 'ollama_tunnel_auth_token', label: 'Auth Token', placeholder: 'token...' },
    ],
  },
  {
    id: 'ollama_local', name: 'Ollama Local', description: 'Local Ollama instance on your machine',
    icon: <Cloud className="w-5 h-5 text-slate-400" />,
    fields: [{ key: 'ollama_local_url', label: 'URL', placeholder: 'http://localhost:11434' }],
  },
]

const BUSINESS_PROVIDERS: Provider[] = [
  {
    id: 'hubspot', name: 'HubSpot CRM', description: 'CRM and marketing automation',
    icon: <Globe className="w-5 h-5 text-orange-500" />,
    fields: [{ key: 'hubspot_token', label: 'Access Token', placeholder: 'pat-...' }],
    testProvider: 'hubspot',
  },
  {
    id: 'salesforce', name: 'Salesforce', description: 'Enterprise CRM platform',
    icon: <Cloud className="w-5 h-5 text-blue-500" />,
    fields: [
      { key: 'salesforce_token', label: 'Access Token', placeholder: 'token...' },
      { key: 'salesforce_instance_url', label: 'Instance URL', placeholder: 'https://yourorg.salesforce.com' },
    ],
    testProvider: 'salesforce',
  },
  {
    id: 'stripe', name: 'Stripe Payments', description: 'Payment processing',
    icon: <CreditCard className="w-5 h-5 text-purple-500" />,
    fields: [{ key: 'stripe_secret_key', label: 'Secret Key', placeholder: 'sk_live_...' }],
    testProvider: 'stripe',
  },
  {
    id: 'quickbooks', name: 'QuickBooks', description: 'Accounting and invoicing',
    icon: <CreditCard className="w-5 h-5 text-emerald-500" />,
    fields: [
      { key: 'quickbooks_token', label: 'Access Token', placeholder: 'token...' },
      { key: 'quickbooks_realm_id', label: 'Realm ID', placeholder: '1234567890' },
    ],
    testProvider: 'quickbooks',
  },
  {
    id: 'twilio', name: 'Twilio SMS', description: 'SMS and voice communications',
    icon: <Phone className="w-5 h-5 text-red-500" />,
    fields: [
      { key: 'twilio_account_sid', label: 'Account SID', placeholder: 'AC...' },
      { key: 'twilio_auth_token', label: 'Auth Token', placeholder: 'token...' },
      { key: 'twilio_phone_number', label: 'Phone Number', placeholder: '+1234567890' },
    ],
    testProvider: 'twilio',
  },
]

const GOOGLE_PROVIDERS: Provider[] = [
  {
    id: 'google_calendar', name: 'Google Calendar', description: 'Calendar integration',
    icon: <Globe className="w-5 h-5 text-blue-600" />,
    fields: [
      { key: 'google_oauth_token', label: 'OAuth Token', placeholder: 'ya29...' },
      { key: 'google_calendar_api_key', label: 'API Key', placeholder: 'AIza...' },
    ],
    testProvider: 'google_calendar',
  },
]

const TABS = [
  { id: 'llm', label: 'LLM Providers', providers: LLM_PROVIDERS },
  { id: 'business', label: 'Business APIs', providers: BUSINESS_PROVIDERS },
  { id: 'google', label: 'Google & Calendar', providers: GOOGLE_PROVIDERS },
] as const

/* ── Component ────────────────────────────────────────────── */

export function Settings() {
  const [activeTab, setActiveTab] = useState<string>('llm')
  const [values, setValues] = useState<Record<string, string>>({})
  const [serverState, setServerState] = useState<Record<string, { set: boolean; masked: string | null }>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState<Set<string>>(new Set())
  const [testResults, setTestResults] = useState<Record<string, { connected: boolean; message: string }>>({})
  const [testing, setTesting] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  /* Load keys on mount */
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/settings/keys')
        if (data.ok) {
          setServerState(data.keys || {})
          // Pre-fill masked values for display
          const init: Record<string, string> = {}
          for (const [k, v] of Object.entries(data.keys || {} as Record<string, { set: boolean; masked: string | null }>)) {
            init[k] = (v as any).masked || ''
          }
          setValues(init)
        }
      } catch {
        showToast('error', 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
    setDirty(prev => new Set(prev).add(key))
  }

  const toggleVisible = (key: string) => {
    setVisible(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSave = async () => {
    if (dirty.size === 0) return
    setSaving(true)
    try {
      const payload: Record<string, string> = {}
      for (const key of dirty) {
        payload[key] = values[key] || ''
      }
      const { data } = await api.put('/settings/keys', { keys: payload })
      if (data.ok) {
        showToast('success', 'API keys saved successfully')
        setDirty(new Set())
        // Refresh server state
        const refresh = await api.get('/settings/keys')
        if (refresh.data.ok) {
          setServerState(refresh.data.keys || {})
        }
      } else {
        showToast('error', data.error || 'Save failed')
      }
    } catch {
      showToast('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (provider: Provider) => {
    if (!provider.testProvider) return
    const pid = provider.testProvider
    setTesting(prev => new Set(prev).add(pid))
    setTestResults(prev => { const next = { ...prev }; delete next[pid]; return next })
    try {
      const { data } = await api.post('/settings/keys/test', { provider: pid })
      setTestResults(prev => ({ ...prev, [pid]: { connected: data.connected, message: data.message } }))
    } catch {
      setTestResults(prev => ({ ...prev, [pid]: { connected: false, message: 'Test request failed' } }))
    } finally {
      setTesting(prev => { const next = new Set(prev); next.delete(pid); return next })
    }
  }

  const isConfigured = (provider: Provider) =>
    provider.fields.every(f => serverState[f.key]?.set)

  const currentTab = TABS.find(t => t.id === activeTab)!

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader />
        <div className="flex justify-center py-20"><span className="loader" /></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {/* Header */}
        <div className="animate-fadeIn mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage API keys and integrations</p>
            </div>
          </div>
        </div>

        {/* Warning banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3 flex items-start gap-3 mb-8 animate-fadeIn">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            API keys are stored securely in the database and never exposed in source code.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 rounded-xl bg-muted p-1 animate-fadeIn">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Provider cards */}
        <div className="space-y-4 animate-fadeIn">
          {currentTab.providers.map(provider => {
            const configured = isConfigured(provider)
            const testPid = provider.testProvider
            const testResult = testPid ? testResults[testPid] : undefined
            const isTesting = testPid ? testing.has(testPid) : false

            return (
              <div key={provider.id} className="rounded-xl bg-card border border-border p-4 hover:border-primary/20 transition-all">
                {/* Card header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-muted border border-border grid place-items-center shrink-0">
                    {provider.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{provider.name}</h3>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${configured ? 'bg-green-500' : 'bg-neutral-400'}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">{provider.description}</p>
                  </div>
                  {testPid && (
                    <button
                      onClick={() => handleTest(provider)}
                      disabled={isTesting}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      Test
                    </button>
                  )}
                </div>

                {/* Test result */}
                {testResult && (
                  <div className={`mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.connected
                      ? 'bg-green-500/10 border border-green-500/20 text-green-600'
                      : 'bg-red-500/10 border border-red-500/20 text-red-500'
                  }`}>
                    {testResult.connected ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    {testResult.message}
                  </div>
                )}

                {/* Fields */}
                <div className="space-y-2.5">
                  {provider.fields.map(field => {
                    const isVisible = visible.has(field.key)
                    const isDirty = dirty.has(field.key)
                    return (
                      <div key={field.key}>
                        <label className="block text-[0.7rem] font-medium text-muted-foreground mb-1">
                          {field.label}
                          {isDirty && <span className="ml-1.5 text-primary">*</span>}
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type={isVisible ? 'text' : 'password'}
                            value={values[field.key] || ''}
                            onChange={e => handleChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="input-field text-sm font-mono flex-1"
                          />
                          <button
                            onClick={() => toggleVisible(field.key)}
                            className="p-2 rounded-lg border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Save button */}
        <div className="mt-8 flex items-center justify-between animate-fadeIn">
          <p className="text-xs text-muted-foreground">
            {dirty.size > 0 ? `${dirty.size} field${dirty.size > 1 ? 's' : ''} changed` : 'No unsaved changes'}
          </p>
          <button
            onClick={handleSave}
            disabled={saving || dirty.size === 0}
            className="btn-primary px-6 py-2.5 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All
          </button>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-2 text-sm animate-slideUp ${
          toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-600'
            : 'bg-red-500/10 border-red-500/20 text-red-500'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default Settings
