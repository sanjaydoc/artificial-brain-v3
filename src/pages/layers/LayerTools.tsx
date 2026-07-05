import { useState, useEffect, useCallback, useRef } from 'react'
import { Wrench, RefreshCw, ShieldOff, Shield, Key, Plus, X, Save, Loader2, Eye, EyeOff, Check, Brain, Database, Settings, Ban } from 'lucide-react'

const DANGEROUS_TOOLS = ['delete_file', 'delete_folder', 'kill_process', 'run_command', 'bash', 'git_commit']

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('brain_token')}`,
  'Content-Type': 'application/json',
})

interface Project { id: string; name: string }
interface Agent {
  id: string
  name: string
  toolPermissions?: string[]
  layers?: { toolRateLimit?: number }
}

export default function LayerTools() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [sandboxMode, setSandboxMode] = useState(true)
  const [blockedTools, setBlockedTools] = useState<string[]>([])
  const [maxCallsPerMin, setMaxCallsPerMin] = useState(30)

  // Track whether config has been loaded to skip auto-save on initial load
  const configLoadedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const agentSaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // --- Fetch projects on mount ---
  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/genesis/api/projects', { headers: authHeaders() })
        const data = await r.json()
        if (data.ok) setProjects(data.projects || [])
      } catch {}
    })()
  }, [])

  // --- Load layers + agents when project changes ---
  const loadProjectData = useCallback(async (projectId: string) => {
    if (!projectId) return
    setLoading(true)
    configLoadedRef.current = false
    try {
      const [layersRes, agentsRes] = await Promise.all([
        fetch(`/genesis/api/projects/${projectId}/layers`, { headers: authHeaders() }),
        fetch(`/genesis/api/projects/${projectId}/agents`, { headers: authHeaders() }),
      ])
      const layersData = await layersRes.json()
      const agentsData = await agentsRes.json()

      if (layersData.ok && layersData.layerConfig?.tools) {
        const t = layersData.layerConfig.tools
        setSandboxMode(t.sandboxMode ?? true)
        setMaxCallsPerMin(t.maxCallsPerMin ?? 30)
        setBlockedTools(t.blockedTools ?? [])
      } else {
        setSandboxMode(true)
        setMaxCallsPerMin(30)
        setBlockedTools([])
      }

      if (agentsData.ok) setAgents(agentsData.agents || [])
      else setAgents([])
    } catch {
      setAgents([])
    } finally {
      setLoading(false)
      // Mark loaded after a tick so the save effect skips this cycle
      setTimeout(() => { configLoadedRef.current = true }, 0)
    }
  }, [])

  useEffect(() => {
    if (selectedProjectId) loadProjectData(selectedProjectId)
    else {
      setAgents([])
      configLoadedRef.current = false
    }
  }, [selectedProjectId, loadProjectData])

  // --- Debounced auto-save for global tools config ---
  useEffect(() => {
    if (!configLoadedRef.current || !selectedProjectId) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/genesis/api/projects/${selectedProjectId}/layers`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ tools: { sandboxMode, maxCallsPerMin, blockedTools } }),
        })
      } catch {}
    }, 500)

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [sandboxMode, maxCallsPerMin, blockedTools, selectedProjectId])

  // --- Save per-agent tool rate limit (debounced per agent) ---
  const saveAgentRateLimit = useCallback((agentId: string, value: number) => {
    const timers = agentSaveTimersRef.current
    if (timers.has(agentId)) clearTimeout(timers.get(agentId)!)
    timers.set(agentId, setTimeout(async () => {
      try {
        await fetch(`/genesis/api/agents/${agentId}/layers`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ toolRateLimit: value }),
        })
      } catch {}
    }, 500))
  }, [])

  const updateAgentRateLimit = (agentId: string, value: number) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, layers: { ...a.layers, toolRateLimit: value } } : a
    ))
    saveAgentRateLimit(agentId, value)
  }

  const toggleBlocked = (tool: string) => {
    setBlockedTools(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    )
  }

  const isBlocked = (tool: string) => blockedTools.includes(tool)

  // 3 categories of keys, each with collapsible sub-groups
  type KeyEntry = { name: string; hint: string }
  type SubGroup = { label: string; keys: KeyEntry[] }
  type KeyGroup = { label: string; color: string; icon: React.ReactNode; description: string; subGroups: SubGroup[] }

  const KEY_GROUPS: KeyGroup[] = [
    { label: 'Brain Keys', color: 'violet', icon: <Brain className="w-3.5 h-3.5" />, description: 'LLM, AI providers, embeddings, vision, audio & search',
      subGroups: [
        { label: 'LLM Providers', keys: [
          { name: 'OPENROUTER_API_KEY', hint: 'sk-or-...' }, { name: 'ANTHROPIC_API_KEY', hint: 'sk-ant-...' },
          { name: 'OPENAI_API_KEY', hint: 'sk-proj-...' }, { name: 'GEMINI_API_KEY', hint: 'AIza...' },
          { name: 'MISTRAL_API_KEY', hint: 'token...' }, { name: 'COHERE_API_KEY', hint: 'co_...' },
          { name: 'AI21_API_KEY', hint: 'token...' }, { name: 'PERPLEXITY_API_KEY', hint: 'pplx-...' },
          { name: 'TOGETHER_API_KEY', hint: 'hex token...' }, { name: 'FIREWORKS_API_KEY', hint: 'fw_...' },
          { name: 'GROQ_API_KEY', hint: 'gsk_...' }, { name: 'DEEPSEEK_API_KEY', hint: 'sk-...' },
          { name: 'XAI_API_KEY', hint: 'xai-...' }, { name: 'LLAMA_API_KEY', hint: 'token...' },
          { name: 'REPLICATE_API_TOKEN', hint: 'r8_...' }, { name: 'CEREBRAS_API_KEY', hint: 'token...' },
          { name: 'SAMBANOVA_API_KEY', hint: 'token...' }, { name: 'NVIDIA_API_KEY', hint: 'nvapi-...' },
          { name: 'HUGGINGFACE_API_KEY', hint: 'hf_...' },
        ]},
        { label: 'Ollama (Self-Hosted)', keys: [
          { name: 'OLLAMA_TUNNEL_URL', hint: 'https://ollama.example.com' },
          { name: 'OLLAMA_TUNNEL_AUTH_TOKEN', hint: 'token...' }, { name: 'OLLAMA_LOCAL_URL', hint: 'http://localhost:11434' },
        ]},
        { label: 'Cloud AI Platforms', keys: [
          { name: 'AZURE_OPENAI_API_KEY', hint: '32-char hex...' }, { name: 'AZURE_OPENAI_ENDPOINT', hint: 'https://xxx.openai.azure.com' },
          { name: 'CLOUDFLARE_API_KEY', hint: 'token...' }, { name: 'CLOUDFLARE_ACCOUNT_ID', hint: 'account id...' },
          { name: 'AWS_ACCESS_KEY_ID', hint: 'AKIA...' }, { name: 'AWS_SECRET_ACCESS_KEY', hint: 'secret...' }, { name: 'AWS_REGION', hint: 'us-east-1' },
        ]},
        { label: 'Embeddings', keys: [
          { name: 'VOYAGE_API_KEY', hint: 'pa-...' }, { name: 'JINA_API_KEY', hint: 'jina_...' }, { name: 'NOMIC_API_KEY', hint: 'nk-...' },
        ]},
        { label: 'Image Generation', keys: [
          { name: 'STABILITY_API_KEY', hint: 'sk-...' }, { name: 'BFL_API_KEY', hint: 'token (FLUX)' },
          { name: 'IDEOGRAM_API_KEY', hint: 'token...' }, { name: 'LEONARDO_API_KEY', hint: 'bearer...' }, { name: 'FAL_KEY', hint: 'token (fal.ai)' },
        ]},
        { label: 'Speech & Audio', keys: [
          { name: 'ELEVENLABS_API_KEY', hint: 'sk_...' }, { name: 'DEEPGRAM_API_KEY', hint: 'token...' }, { name: 'ASSEMBLYAI_API_KEY', hint: 'hex...' },
        ]},
        { label: 'Video & Vision', keys: [{ name: 'RUNWAYML_API_SECRET', hint: 'token...' }, { name: 'LUMAAI_API_KEY', hint: 'token...' }] },
        { label: 'Agent Observability', keys: [{ name: 'LANGSMITH_API_KEY', hint: 'lsv2_...' }, { name: 'LLAMA_CLOUD_API_KEY', hint: 'llx-...' }] },
        { label: 'AI Search', keys: [
          { name: 'TAVILY_API_KEY', hint: 'tvly-...' }, { name: 'SERPER_API_KEY', hint: 'token...' },
          { name: 'SERPAPI_API_KEY', hint: 'hex...' }, { name: 'WOLFRAM_ALPHA_APPID', hint: 'app id...' },
        ]},
      ],
    },
    { label: 'Database Keys', color: 'emerald', icon: <Database className="w-3.5 h-3.5" />, description: 'Database connections & storage',
      subGroups: [
        { label: 'Document DBs', keys: [
          { name: 'MONGODB_URI', hint: 'mongodb+srv://...' }, { name: 'FIREBASE_API_KEY', hint: 'AIza...' }, { name: 'FIREBASE_PROJECT_ID', hint: 'my-project-id' },
        ]},
        { label: 'SQL Databases', keys: [
          { name: 'DATABASE_URL', hint: 'postgres://...' }, { name: 'POSTGRES_URL', hint: 'postgres://...' }, { name: 'MYSQL_URL', hint: 'mysql://...' },
          { name: 'NEON_DATABASE_URL', hint: 'postgres://...neon.tech' }, { name: 'PLANETSCALE_URL', hint: 'mysql://...psdb.cloud' },
          { name: 'COCKROACHDB_URL', hint: 'postgresql://...' }, { name: 'TURSO_DATABASE_URL', hint: 'libsql://...' }, { name: 'TURSO_AUTH_TOKEN', hint: 'token...' },
          { name: 'SUPABASE_URL', hint: 'https://xxx.supabase.co' }, { name: 'SUPABASE_KEY', hint: 'eyJ...' },
        ]},
        { label: 'Cache / Key-Value', keys: [
          { name: 'REDIS_URL', hint: 'redis://localhost:6379' }, { name: 'UPSTASH_REDIS_URL', hint: 'https://xxx.upstash.io' }, { name: 'UPSTASH_REDIS_TOKEN', hint: 'AXxx...' },
        ]},
        { label: 'Graph DBs', keys: [
          { name: 'NEO4J_URI', hint: 'bolt://localhost:7687' }, { name: 'NEO4J_USER', hint: 'neo4j' }, { name: 'NEO4J_PASSWORD', hint: 'password' },
        ]},
        { label: 'Vector DBs', keys: [
          { name: 'PINECONE_API_KEY', hint: 'pc-...' }, { name: 'QDRANT_URL', hint: 'http://localhost:6333' }, { name: 'QDRANT_API_KEY', hint: 'api-key...' },
          { name: 'WEAVIATE_URL', hint: 'http://localhost:8080' }, { name: 'CHROMADB_URL', hint: 'http://localhost:8000' },
        ]},
        { label: 'Search & Cloud Storage', keys: [
          { name: 'ELASTICSEARCH_URL', hint: 'http://localhost:9200' },
          { name: 'S3_ACCESS_KEY', hint: 'AKIA...' }, { name: 'S3_SECRET_KEY', hint: 'secret...' }, { name: 'S3_BUCKET', hint: 'my-bucket' }, { name: 'S3_REGION', hint: 'us-east-1' },
          { name: 'DYNAMODB_ACCESS_KEY', hint: 'AKIA...' }, { name: 'DYNAMODB_SECRET_KEY', hint: 'secret...' }, { name: 'DYNAMODB_REGION', hint: 'us-east-1' },
          { name: 'AIRTABLE_API_KEY', hint: 'pat...' },
        ]},
      ],
    },
    { label: 'Tools Keys', color: 'amber', icon: <Wrench className="w-3.5 h-3.5" />, description: 'Business APIs, SaaS & platform integrations',
      subGroups: [
        { label: 'CRM & Sales', keys: [
          { name: 'HUBSPOT_TOKEN', hint: 'pat-na1-...' }, { name: 'SALESFORCE_TOKEN', hint: 'token...' }, { name: 'SALESFORCE_INSTANCE_URL', hint: 'https://org.salesforce.com' },
          { name: 'PIPEDRIVE_API_TOKEN', hint: '40-char hex' }, { name: 'ZOHO_CLIENT_ID', hint: 'client id' }, { name: 'ZOHO_CLIENT_SECRET', hint: 'secret' },
          { name: 'FRESHSALES_API_KEY', hint: 'alphanumeric' }, { name: 'CLOSE_API_KEY', hint: 'alphanumeric' },
          { name: 'APOLLO_API_KEY', hint: 'alphanumeric' }, { name: 'CLEARBIT_API_KEY', hint: 'sk_...' }, { name: 'CLAY_API_KEY', hint: 'alphanumeric' },
        ]},
        { label: 'Email & Marketing', keys: [
          { name: 'MAILCHIMP_API_KEY', hint: 'key-us5' }, { name: 'SENDGRID_API_KEY', hint: 'SG....' }, { name: 'MAILGUN_API_KEY', hint: 'key-...' },
          { name: 'POSTMARK_SERVER_TOKEN', hint: 'uuid...' }, { name: 'RESEND_API_KEY', hint: 're_...' }, { name: 'BREVO_API_KEY', hint: 'xkeysib-...' },
          { name: 'CONVERTKIT_API_KEY', hint: 'alphanumeric' }, { name: 'KLAVIYO_PRIVATE_KEY', hint: 'pk_...' },
          { name: 'ACTIVECAMPAIGN_API_KEY', hint: 'alphanumeric' },
        ]},
        { label: 'Payments & Billing', keys: [
          { name: 'STRIPE_SECRET_KEY', hint: 'sk_live_...' }, { name: 'PAYPAL_CLIENT_ID', hint: 'client id' }, { name: 'PAYPAL_CLIENT_SECRET', hint: 'secret' },
          { name: 'SQUARE_ACCESS_TOKEN', hint: 'sq0atp-...' }, { name: 'RAZORPAY_KEY_ID', hint: 'rzp_live_...' }, { name: 'RAZORPAY_KEY_SECRET', hint: 'secret' },
          { name: 'PADDLE_API_KEY', hint: 'pdl_live_...' }, { name: 'LEMONSQUEEZY_API_KEY', hint: 'alphanumeric' }, { name: 'CHARGEBEE_API_KEY', hint: 'alphanumeric' },
        ]},
        { label: 'Communication', keys: [
          { name: 'SLACK_BOT_TOKEN', hint: 'xoxb-...' }, { name: 'SLACK_WEBHOOK_URL', hint: 'https://hooks.slack.com/...' },
          { name: 'DISCORD_BOT_TOKEN', hint: 'base64 token' }, { name: 'DISCORD_WEBHOOK_URL', hint: 'https://discord.com/api/...' },
          { name: 'TELEGRAM_BOT_TOKEN', hint: '123456789:ABC...' }, { name: 'WHATSAPP_TOKEN', hint: 'meta graph token' },
          { name: 'INTERCOM_ACCESS_TOKEN', hint: 'bearer token' }, { name: 'ZENDESK_API_TOKEN', hint: '40-char token' }, { name: 'FRESHDESK_API_KEY', hint: 'alphanumeric' },
        ]},
        { label: 'SMS & Phone', keys: [
          { name: 'TWILIO_ACCOUNT_SID', hint: 'AC...' }, { name: 'TWILIO_AUTH_TOKEN', hint: 'auth token' }, { name: 'TWILIO_PHONE_NUMBER', hint: '+1...' },
          { name: 'VONAGE_API_KEY', hint: '8-char key' }, { name: 'VONAGE_API_SECRET', hint: '16-char secret' },
          { name: 'PLIVO_AUTH_ID', hint: 'auth id' }, { name: 'TELNYX_API_KEY', hint: 'KEY...' }, { name: 'MESSAGEBIRD_API_KEY', hint: 'access key' },
        ]},
        { label: 'Project Management', keys: [
          { name: 'JIRA_API_TOKEN', hint: 'alphanumeric' }, { name: 'JIRA_BASE_URL', hint: 'co.atlassian.net' },
          { name: 'ASANA_ACCESS_TOKEN', hint: 'bearer token' }, { name: 'LINEAR_API_KEY', hint: 'lin_api_...' },
          { name: 'MONDAY_API_TOKEN', hint: 'jwt token' }, { name: 'NOTION_API_KEY', hint: 'ntn_...' },
          { name: 'TRELLO_API_KEY', hint: '32-char hex' }, { name: 'CLICKUP_API_TOKEN', hint: 'pk_...' },
        ]},
        { label: 'Social Media', keys: [
          { name: 'TWITTER_API_KEY', hint: '25-char' }, { name: 'TWITTER_BEARER_TOKEN', hint: 'bearer token' },
          { name: 'FACEBOOK_APP_ID', hint: 'numeric id' }, { name: 'FACEBOOK_ACCESS_TOKEN', hint: 'token' },
          { name: 'INSTAGRAM_ACCESS_TOKEN', hint: 'meta graph token' }, { name: 'LINKEDIN_ACCESS_TOKEN', hint: 'token' },
          { name: 'YOUTUBE_API_KEY', hint: 'AIza...' }, { name: 'TIKTOK_APP_KEY', hint: 'alphanumeric' },
          { name: 'REDDIT_CLIENT_ID', hint: '22-char' }, { name: 'PINTEREST_ACCESS_TOKEN', hint: 'bearer token' },
        ]},
        { label: 'E-commerce', keys: [
          { name: 'SHOPIFY_TOKEN', hint: 'shpat_...' }, { name: 'WOOCOMMERCE_CONSUMER_KEY', hint: 'ck_...' }, { name: 'WOOCOMMERCE_URL', hint: 'https://store.com' },
          { name: 'ETSY_API_KEY', hint: 'keystring' }, { name: 'BIGCOMMERCE_ACCESS_TOKEN', hint: 'token' }, { name: 'QUICKBOOKS_TOKEN', hint: 'eyJ...' }, { name: 'QUICKBOOKS_REALM_ID', hint: '1234567890' },
        ]},
        { label: 'Google & Calendar', keys: [
          { name: 'GOOGLE_OAUTH_TOKEN', hint: 'ya29...' }, { name: 'GOOGLE_CALENDAR_API_KEY', hint: 'AIza...' }, { name: 'GOOGLE_MAPS_API_KEY', hint: 'AIza...' },
          { name: 'CALENDLY_API_KEY', hint: 'bearer token' }, { name: 'CALCOM_API_KEY', hint: 'cal_live_...' },
          { name: 'MICROSOFT_CLIENT_ID', hint: 'uuid' }, { name: 'MICROSOFT_CLIENT_SECRET', hint: 'secret' },
        ]},
        { label: 'Analytics', keys: [
          { name: 'GA_MEASUREMENT_ID', hint: 'G-XXXXXXXXXX' }, { name: 'MIXPANEL_TOKEN', hint: '32-char hex' },
          { name: 'AMPLITUDE_API_KEY', hint: '32-char hex' }, { name: 'SEGMENT_WRITE_KEY', hint: 'alphanumeric' }, { name: 'POSTHOG_API_KEY', hint: 'phc_...' },
        ]},
        { label: 'HR & Recruiting', keys: [
          { name: 'GREENHOUSE_API_KEY', hint: 'alphanumeric' }, { name: 'LEVER_API_KEY', hint: 'alphanumeric' },
          { name: 'BAMBOOHR_API_KEY', hint: 'alphanumeric' }, { name: 'GUSTO_API_TOKEN', hint: 'bearer token' }, { name: 'DEEL_API_TOKEN', hint: 'bearer token' },
        ]},
        { label: 'Legal & Docs', keys: [
          { name: 'DOCUSIGN_INTEGRATION_KEY', hint: 'uuid' }, { name: 'PANDADOC_API_KEY', hint: 'alphanumeric' },
          { name: 'DROPBOX_ACCESS_TOKEN', hint: 'oauth2 token' }, { name: 'CLOUDINARY_URL', hint: 'cloudinary://...' },
        ]},
        { label: 'Maps & Translation', keys: [
          { name: 'MAPBOX_ACCESS_TOKEN', hint: 'pk....' }, { name: 'OPENCAGE_API_KEY', hint: '32-char hex' }, { name: 'DEEPL_API_KEY', hint: 'uuid:fx' },
        ]},
        { label: 'Dev Tools & Infra', keys: [
          { name: 'GITHUB_TOKEN', hint: 'ghp_...' }, { name: 'GITLAB_TOKEN', hint: 'glpat-...' }, { name: 'SENTRY_DSN', hint: 'https://...sentry.io' },
          { name: 'DATADOG_API_KEY', hint: '32-char hex' }, { name: 'NPM_TOKEN', hint: 'npm_...' },
          { name: 'VERCEL_TOKEN', hint: 'bearer token' }, { name: 'NETLIFY_AUTH_TOKEN', hint: 'alphanumeric' },
          { name: 'DIGITALOCEAN_TOKEN', hint: '64-char hex' }, { name: 'FLY_API_TOKEN', hint: 'bearer token' }, { name: 'RENDER_API_KEY', hint: 'rnd_...' },
        ]},
        { label: 'Auth & Automation', keys: [
          { name: 'AUTH0_DOMAIN', hint: 'co.auth0.com' }, { name: 'AUTH0_CLIENT_ID', hint: 'client id' }, { name: 'CLERK_SECRET_KEY', hint: 'sk_live_...' },
          { name: 'ZAPIER_WEBHOOK_URL', hint: 'https://hooks.zapier.com/...' }, { name: 'MAKE_API_TOKEN', hint: 'bearer token' }, { name: 'N8N_WEBHOOK_URL', hint: 'https://n8n...' },
        ]},
        { label: 'CMS', keys: [
          { name: 'CONTENTFUL_DELIVERY_TOKEN', hint: 'token' }, { name: 'CONTENTFUL_SPACE_ID', hint: '12-char' },
          { name: 'SANITY_API_TOKEN', hint: 'token' }, { name: 'WEBFLOW_API_TOKEN', hint: 'bearer token' }, { name: 'WEBHOOK_SECRET', hint: 'whsec_...' },
        ]},
        { label: 'Forms & Surveys', keys: [
          { name: 'TYPEFORM_ACCESS_TOKEN', hint: 'tfp_...' }, { name: 'SURVEYMONKEY_ACCESS_TOKEN', hint: 'bearer token' }, { name: 'JOTFORM_API_KEY', hint: 'alphanumeric' },
        ]},
      ],
    },
  ]

  // Flatten helpers
  const ALL_KEYS = KEY_GROUPS.flatMap(g => g.subGroups.flatMap(sg => sg.keys))
  const KEY_HINT_MAP = Object.fromEntries(ALL_KEYS.map(k => [k.name, k.hint]))

  function getKeyCategory(keyName: string): { label: string; color: string; icon: React.ReactNode } {
    for (const g of KEY_GROUPS) {
      for (const sg of g.subGroups) {
        if (sg.keys.some(k => k.name === keyName)) return { label: g.label, color: g.color, icon: g.icon }
      }
    }
    return { label: 'Custom', color: 'slate', icon: <Settings className="w-3.5 h-3.5" /> }
  }

  // ── Searchable key picker with collapsible sub-groups ─────────────────
  function KeyPicker({ group, existingKeys, onSelect, onClose }: {
    group: KeyGroup; existingKeys: Set<string>; onSelect: (name: string) => void; onClose: () => void
  }) {
    const [search, setSearch] = useState('')
    const [expanded, setExpanded] = useState<Set<string>>(new Set([group.subGroups[0]?.label]))
    const toggle = (label: string) => setExpanded(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n })
    const q = search.toLowerCase()

    return (
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <div className="absolute right-0 top-8 z-50 w-72 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <input value={search} onChange={e => setSearch(e.target.value)} autoFocus
              className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary outline-none transition-colors"
              placeholder="Search keys..." />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {group.subGroups.map(sg => {
              const available = sg.keys.filter(k => !existingKeys.has(k.name) && (!q || k.name.toLowerCase().includes(q) || sg.label.toLowerCase().includes(q)))
              if (available.length === 0 && q) return null
              const isOpen = expanded.has(sg.label) || !!q
              return (
                <div key={sg.label}>
                  <button onClick={() => toggle(sg.label)}
                    className="w-full flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/50 hover:bg-muted/60 transition-colors">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{sg.label}</span>
                    <span className="text-[9px] text-muted-foreground">{available.length}</span>
                  </button>
                  {isOpen && available.map(k => (
                    <button key={k.name} onClick={() => onSelect(k.name)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center justify-between gap-2">
                      <span className="font-mono text-foreground truncate">{k.name}</span>
                      <span className="text-[9px] text-muted-foreground shrink-0">{k.hint}</span>
                    </button>
                  ))}
                  {isOpen && available.length === 0 && (
                    <p className="px-3 py-1.5 text-[10px] text-muted-foreground italic">All added</p>
                  )}
                </div>
              )
            })}
          </div>
          <div className="border-t border-border">
            <button onClick={() => onSelect('')}
              className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-accent transition-colors font-semibold">
              + Custom Key
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Per-agent secrets card with 3 grouped sections ────────────────────
  function AgentSecretsCard({ agentId, agentName }: { agentId: string; agentName: string }) {
    const [rows, setRows] = useState<{ key: string; value: string; masked: string; isSet: boolean }[]>([])
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<string | null>(null)
    const [showValues, setShowValues] = useState<Record<number, boolean>>({})
    const [openPicker, setOpenPicker] = useState<string | null>(null) // which group picker is open

    useEffect(() => {
      fetch(`/genesis/api/agents/${agentId}/secrets`, { headers: authHeaders() })
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.secrets) {
            const entries = Object.entries(data.secrets as Record<string, { set: boolean; masked: string | null }>)
            if (entries.length > 0) setRows(entries.map(([k, info]) => ({ key: k, value: '', masked: info.masked || '', isSet: info.set })))
          }
        })
        .catch(() => {})
    }, [agentId])

    const configuredCount = rows.filter(r => r.isSet).length
    const existingKeys = new Set(rows.map(r => r.key))

    const addRow = (keyName: string) => {
      setRows(prev => [...prev, { key: keyName, value: '', masked: '', isSet: false }])
      setOpenPicker(null)
    }
    const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))
    const updateRow = (i: number, field: 'key' | 'value', val: string) => {
      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
    }
    const toggleShow = (i: number) => setShowValues(prev => ({ ...prev, [i]: !prev[i] }))

    const handleSave = async () => {
      setSaving(true); setStatus(null)
      try {
        const secrets: Record<string, string> = {}
        for (const r of rows) { if (r.key.trim() && r.value) secrets[r.key.trim()] = r.value }
        const res = await fetch(`/genesis/api/agents/${agentId}/secrets`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ secrets }) })
        const data = await res.json()
        if (data.ok) {
          setStatus('Saved')
          const reload = await fetch(`/genesis/api/agents/${agentId}/secrets`, { headers: authHeaders() })
          const rd = await reload.json()
          if (rd.ok && rd.secrets) {
            const entries = Object.entries(rd.secrets as Record<string, { set: boolean; masked: string | null }>)
            if (entries.length > 0) setRows(entries.map(([k, info]) => ({ key: k, value: '', masked: info.masked || '', isSet: info.set })))
          }
        } else setStatus('Error')
      } catch { setStatus('Error') }
      finally { setSaving(false); setTimeout(() => setStatus(null), 3000) }
    }

    // Group rows by category
    const getRowsForGroup = (group: KeyGroup) => {
      const groupKeyNames = new Set(group.subGroups.flatMap(sg => sg.keys.map(k => k.name)))
      return rows.map((r, i) => ({ ...r, idx: i })).filter(r => groupKeyNames.has(r.key))
    }
    const uncategorizedRows = rows.map((r, i) => ({ ...r, idx: i })).filter(r => getKeyCategory(r.key).label === 'Custom')

    const colorBorder: Record<string, string> = { violet: 'border-violet-500/30', emerald: 'border-emerald-500/30', amber: 'border-amber-500/30' }
    const colorBg: Record<string, string> = { violet: 'bg-violet-500/5', emerald: 'bg-emerald-500/5', amber: 'bg-amber-500/5' }
    const colorText: Record<string, string> = { violet: 'text-violet-500', emerald: 'text-emerald-500', amber: 'text-amber-600' }

    return (
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-semibold text-foreground">{agentName}</p>
          {configuredCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 border border-green-500/20">
              {configuredCount} key{configuredCount !== 1 ? 's' : ''} configured
            </span>
          )}
        </div>

        <div className="space-y-3">
          {KEY_GROUPS.map(group => {
            const groupRows = getRowsForGroup(group)
            return (
              <div key={group.label} className={`rounded-lg border ${colorBorder[group.color]} ${colorBg[group.color]} p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center">{group.icon}</span>
                    <span className={`text-xs font-bold ${colorText[group.color]}`}>{group.label}</span>
                    <span className="text-[9px] text-muted-foreground">({groupRows.filter(r => r.isSet).length}/{groupRows.length})</span>
                  </div>
                  <div className="relative">
                    <button onClick={() => setOpenPicker(openPicker === group.label ? null : group.label)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${colorBorder[group.color]} ${colorText[group.color]} hover:opacity-80 flex items-center gap-1`}>
                      <Plus className="w-2.5 h-2.5" /> Add
                    </button>
                    {openPicker === group.label && (
                      <KeyPicker group={group} existingKeys={existingKeys} onSelect={addRow} onClose={() => setOpenPicker(null)} />
                    )}
                  </div>
                </div>

                {groupRows.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No keys configured</p>
                ) : (
                  <div className="space-y-1.5">
                    {groupRows.map(row => (
                      <div key={row.idx} className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.isSet ? 'bg-green-500' : 'bg-neutral-500'}`} />
                        <span className="text-[10px] font-mono font-semibold text-foreground w-[140px] truncate shrink-0">{row.key}</span>
                        <input
                          type={showValues[row.idx] ? 'text' : 'password'}
                          value={row.value}
                          onChange={e => updateRow(row.idx, 'value', e.target.value)}
                          className="flex-1 bg-input border border-border rounded-lg px-2 py-1 text-[10px] font-mono text-foreground placeholder-muted-foreground focus:border-primary outline-none min-w-0"
                          placeholder={row.isSet && row.masked ? row.masked : (KEY_HINT_MAP[row.key] || 'paste value')}
                        />
                        <button onClick={() => toggleShow(row.idx)} className="p-0.5 rounded hover:bg-accent transition-colors shrink-0">
                          {showValues[row.idx] ? <EyeOff className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
                        </button>
                        <button onClick={() => removeRow(row.idx)} className="p-0.5 rounded hover:bg-destructive/10 transition-colors shrink-0">
                          <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Uncategorized / custom keys */}
          {uncategorizedRows.length > 0 && (
            <div className="rounded-lg border border-slate-500/30 bg-slate-500/5 p-3">
              <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1"><Settings className="w-3.5 h-3.5" /> Custom Keys</p>
              <div className="space-y-1.5">
                {uncategorizedRows.map(row => (
                  <div key={row.idx} className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.isSet ? 'bg-green-500' : 'bg-neutral-500'}`} />
                    <input value={row.key} onChange={e => updateRow(row.idx, 'key', e.target.value)}
                      className="text-[10px] font-mono font-semibold text-foreground bg-transparent outline-none w-[140px] shrink-0 placeholder-muted-foreground" placeholder="KEY_NAME" />
                    <input type={showValues[row.idx] ? 'text' : 'password'} value={row.value} onChange={e => updateRow(row.idx, 'value', e.target.value)}
                      className="flex-1 bg-input border border-border rounded-lg px-2 py-1 text-[10px] font-mono text-foreground placeholder-muted-foreground focus:border-primary outline-none min-w-0"
                      placeholder="paste value" />
                    <button onClick={() => toggleShow(row.idx)} className="p-0.5 rounded hover:bg-accent transition-colors shrink-0">
                      {showValues[row.idx] ? <EyeOff className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
                    </button>
                    <button onClick={() => removeRow(row.idx)} className="p-0.5 rounded hover:bg-destructive/10 transition-colors shrink-0">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button onClick={handleSave} disabled={saving}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-40 flex items-center gap-1.5">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Keys
          </button>
          {status && (
            <span className={`text-xs font-semibold flex items-center gap-1 ${status === 'Saved' ? 'text-green-500' : 'text-red-500'}`}>
              {status === 'Saved' ? <><Check className="w-3 h-3" /> Saved</> : <><X className="w-3 h-3" /> Failed</>}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.7rem] font-medium text-muted-foreground mb-2">Layer 3</p>
        <h1 className="text-lg font-kanit font-semibold">Tools Config</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Sandbox settings, per-agent tool permissions, rate limits, and blocked tools.
        </p>
      </div>

      {/* Project selector */}
      <div>
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
        >
          {projects.length === 0 ? (
            <option value="">No projects found</option>
          ) : (
            <>
              <option value="">Select a project to configure</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </>
          )}
        </select>
      </div>

      {!selectedProjectId ? (
        <p className="text-sm text-muted-foreground text-center py-8">Select a project to configure</p>
      ) : loading ? (
        <div className="flex justify-center py-10"><span className="loader" /></div>
      ) : (
        <>
          {/* Global settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-[0.7rem] font-medium text-muted-foreground mb-3">Sandbox Mode</h3>
              <button onClick={() => setSandboxMode(s => !s)}
                className={`w-full py-3 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
                  sandboxMode ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-red-500/10 border-red-500/30 text-red-600'
                }`}>
                {sandboxMode ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                {sandboxMode ? 'Sandbox ON — Tools run in restricted mode' : 'Sandbox OFF — Tools run unrestricted'}
              </button>
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-[0.7rem] font-medium text-muted-foreground mb-3">
                Rate Limit: {maxCallsPerMin} calls/min per agent
              </h3>
              <input type="range" min="5" max="100" step="5" value={maxCallsPerMin}
                onChange={e => setMaxCallsPerMin(Number(e.target.value))}
                className="w-full accent-primary" />
            </div>
          </div>

          {/* Globally blocked tools */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h3 className="text-sm font-kanit font-semibold mb-3 flex items-center gap-2">
              <ShieldOff className="w-4 h-4 text-red-500" /> Globally Blocked Tools
            </h3>
            <p className="text-xs text-muted-foreground mb-3">These tools are blocked for ALL agents regardless of their individual permissions.</p>
            <div className="flex flex-wrap gap-2">
              {DANGEROUS_TOOLS.map(tool => {
                const blocked = isBlocked(tool)
                return (
                  <button key={tool} onClick={() => toggleBlocked(tool)}
                    className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all ${
                      blocked ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'bg-muted border-border text-muted-foreground hover:border-red-300'
                    }`}>
                    {blocked ? <><Ban className="w-3 h-3 inline-block mr-1" /></> : null}{tool}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Per-agent API keys */}
          {agents.length > 0 && (
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-kanit font-semibold flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" /> Per-Agent API Keys
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Each agent can have its own API keys and database connections. Agent keys override global settings.
              </p>
              <div className="space-y-4">
                {agents.map(agent => (
                  <AgentSecretsCard key={agent.id} agentId={agent.id} agentName={agent.name} />
                ))}
              </div>
            </div>
          )}

          {/* Per-agent permissions matrix */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-kanit font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" /> Per-Agent Tool Permissions
              </h3>
              <button onClick={() => loadProjectData(selectedProjectId)} className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {agents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No agents deployed.</p>
            ) : (
              <div className="space-y-4">
                {agents.map(agent => (
                  <div key={agent.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground whitespace-nowrap">
                          Rate limit: {agent.layers?.toolRateLimit ?? maxCallsPerMin}/min
                        </label>
                        <input
                          type="range" min="5" max="100" step="5"
                          value={agent.layers?.toolRateLimit ?? maxCallsPerMin}
                          onChange={e => updateAgentRateLimit(agent.id, Number(e.target.value))}
                          className="w-24 accent-primary"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(agent.toolPermissions || []).map(tool => (
                        <span key={tool} className={`text-[10px] font-mono px-2 py-1 rounded-lg border ${
                          isBlocked(tool) ? 'bg-red-500/10 text-red-500 border-red-500/20 line-through' : 'bg-teal-500/10 text-teal-600 border-teal-500/20'
                        }`}>{tool}</span>
                      ))}
                      {(!agent.toolPermissions || agent.toolPermissions.length === 0) && (
                        <span className="text-xs text-muted-foreground">No tools assigned</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
