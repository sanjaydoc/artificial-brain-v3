import { useState, useEffect, useCallback, useRef } from 'react'
import { Shield, AlertTriangle, CheckCircle, Bell, Mail, Globe, ToggleLeft, ToggleRight } from 'lucide-react'

interface GovernanceRule {
  action: string
  threshold: string
  requires: string
}

interface Project { id: string; name: string }

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('brain_token')}`,
  'Content-Type': 'application/json',
})

export default function Guardrails() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectsLoading, setProjectsLoading] = useState(true)

  const [inputCheck, setInputCheck] = useState(true)
  const [outputCheck, setOutputCheck] = useState(true)
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>('medium')
  const [autoApprove, setAutoApprove] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyWebhook, setNotifyWebhook] = useState('')
  const [rules, setRules] = useState<GovernanceRule[]>([])
  const [newRule, setNewRule] = useState<GovernanceRule>({ action: '', threshold: '', requires: 'human_approval' })

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialMount = useRef(true)

  // Fetch projects on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/genesis/api/projects', { headers: authHeaders() })
        const data = await r.json()
        if (data.ok) setProjects(data.projects || [])
      } catch {} finally { setProjectsLoading(false) }
    })()
  }, [])

  // Load layer config when project changes
  const loadProjectData = useCallback(async (pid: string) => {
    if (!pid) return
    try {
      const res = await fetch(`/genesis/api/projects/${pid}/layers`, { headers: authHeaders() })
      const data = await res.json()
      if (data.ok && data.layerConfig?.guardrails) {
        const g = data.layerConfig.guardrails
        if (g.inputCheck != null) setInputCheck(g.inputCheck)
        if (g.outputCheck != null) setOutputCheck(g.outputCheck)
        if (g.sensitivity) setSensitivity(g.sensitivity)
        if (g.autoApprove != null) setAutoApprove(g.autoApprove)
        if (g.notifications?.email != null) setNotifyEmail(g.notifications.email)
        if (g.notifications?.webhook != null) setNotifyWebhook(g.notifications.webhook)
        if (g.governanceRules) setRules(g.governanceRules)
      }
    } catch {}
  }, [])

  useEffect(() => { loadProjectData(selectedProjectId) }, [selectedProjectId, loadProjectData])

  // Reset initial-mount guard when project changes so loaded values aren't saved back
  useEffect(() => { isInitialMount.current = true }, [selectedProjectId])

  // Debounced save for guardrails config
  const saveGuardrailsConfig = useCallback((
    ic: boolean, oc: boolean, s: string, aa: boolean, email: string, webhook: string, govRules: GovernanceRule[]
  ) => {
    if (!selectedProjectId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/genesis/api/projects/${selectedProjectId}/layers`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            guardrails: {
              inputCheck: ic, outputCheck: oc, sensitivity: s, autoApprove: aa,
              notifications: { email, webhook },
              governanceRules: govRules,
            },
          }),
        })
      } catch {}
    }, 500)
  }, [selectedProjectId])

  // Trigger debounced save when config values change
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return }
    saveGuardrailsConfig(inputCheck, outputCheck, sensitivity, autoApprove, notifyEmail, notifyWebhook, rules)
  }, [inputCheck, outputCheck, sensitivity, autoApprove, notifyEmail, notifyWebhook, saveGuardrailsConfig])
  // Note: rules excluded from deps — rules are saved immediately on add/remove

  // Immediate save helper for governance rules (discrete actions)
  const saveRulesImmediately = useCallback((updatedRules: GovernanceRule[]) => {
    if (!selectedProjectId) return
    // Cancel any pending debounced save to avoid conflicts
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    ;(async () => {
      try {
        await fetch(`/genesis/api/projects/${selectedProjectId}/layers`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            guardrails: {
              inputCheck, outputCheck, sensitivity, autoApprove,
              notifications: { email: notifyEmail, webhook: notifyWebhook },
              governanceRules: updatedRules,
            },
          }),
        })
      } catch {}
    })()
  }, [selectedProjectId, inputCheck, outputCheck, sensitivity, autoApprove, notifyEmail, notifyWebhook])

  const addRule = () => {
    if (!newRule.action.trim() || !newRule.threshold.trim()) return
    const updated = [...rules, { ...newRule }]
    setRules(updated)
    setNewRule({ action: '', threshold: '', requires: 'human_approval' })
    saveRulesImmediately(updated)
  }

  const removeRule = (i: number) => {
    const updated = rules.filter((_, idx) => idx !== i)
    setRules(updated)
    saveRulesImmediately(updated)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.7rem] font-medium text-muted-foreground mb-2">Layer 6</p>
        <h1 className="text-lg font-kanit font-semibold">Guardrails + Governance</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Input/output guardrails, governance rules, human-in-the-loop approvals, and auto-approve toggle.
        </p>
      </div>

      {/* Project selector */}
      <div className="flex items-center gap-3">
        <label className="text-[0.7rem] font-medium text-muted-foreground shrink-0">Project</label>
        {projectsLoading ? (
          <span className="text-xs text-muted-foreground">Loading projects...</span>
        ) : projects.length === 0 ? (
          <span className="text-xs text-muted-foreground">No projects found</span>
        ) : (
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
          >
            <option value="">Select a project...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {!selectedProjectId ? (
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">Select a project to configure</p>
        </div>
      ) : (
        <>
          {/* Auto-approve toggle */}
          <div className={`rounded-xl border p-4 ${autoApprove ? 'border-yellow-500/30 bg-yellow-500/[0.04]' : 'border-border bg-card'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {autoApprove ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> : <Shield className="w-5 h-5 text-primary" />}
                <div>
                  <h3 className="text-sm font-kanit font-semibold">Auto-Approve</h3>
                  <p className="text-xs text-muted-foreground">
                    {autoApprove ? 'All actions auto-approved — no human-in-the-loop. Use with caution.' : 'Actions above governance thresholds require human approval.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setAutoApprove(a => !a)}
                className="shrink-0">
                {autoApprove
                  ? <ToggleRight className="w-10 h-10 text-yellow-500" />
                  : <ToggleLeft className="w-10 h-10 text-muted-foreground" />}
              </button>
            </div>
            {autoApprove && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">Warning: Agents will execute all actions without human review, including those above governance thresholds.</p>
              </div>
            )}
          </div>

          {/* Input / Output guardrails */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[0.7rem] font-medium text-muted-foreground">Input Guardrails</h3>
                <button onClick={() => setInputCheck(c => !c)}
                  className={`text-[0.75rem] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    inputCheck ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-muted border-border text-muted-foreground'
                  }`}>
                  {inputCheck ? 'ON' : 'OFF'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Checks incoming prompts for prompt injection, jailbreak attempts, and malicious content.</p>
              <div className="space-y-2">
                {['Prompt injection detection', 'Jailbreak pattern matching', 'Malicious content filtering'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs">
                    <CheckCircle className={`w-3 h-3 ${inputCheck ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={inputCheck ? 'text-foreground' : 'text-muted-foreground'}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[0.7rem] font-medium text-muted-foreground">Output Guardrails</h3>
                <button onClick={() => setOutputCheck(c => !c)}
                  className={`text-[0.75rem] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    outputCheck ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-muted border-border text-muted-foreground'
                  }`}>
                  {outputCheck ? 'ON' : 'OFF'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Checks agent responses for inappropriate content, PII leaks, and incorrect format.</p>
              <div className="space-y-2">
                {['Inappropriate content filter', 'PII leak detection', 'Format validation'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs">
                    <CheckCircle className={`w-3 h-3 ${outputCheck ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={outputCheck ? 'text-foreground' : 'text-muted-foreground'}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sensitivity */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h3 className="text-[0.7rem] font-medium text-muted-foreground mb-3">Sensitivity Level</h3>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(s => (
                <button key={s} onClick={() => setSensitivity(s)}
                  className={`flex-1 py-2.5 rounded-lg text-[0.75rem] font-semibold border transition-all capitalize ${
                    sensitivity === s ? (
                      s === 'low' ? 'bg-green-500/10 border-green-500/40 text-green-600' :
                      s === 'medium' ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-600' :
                      'bg-red-500/10 border-red-500/40 text-red-600'
                    ) : 'bg-muted border-border text-muted-foreground'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {sensitivity === 'low' && 'Only blocks obvious attacks. Best for internal agents.'}
              {sensitivity === 'medium' && 'Balanced — blocks suspicious patterns without over-filtering.'}
              {sensitivity === 'high' && 'Strict — may flag some legitimate inputs. Best for customer-facing agents.'}
            </p>
          </div>

          {/* Governance rules */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h3 className="text-sm font-kanit font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Governance Rules
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Actions above these thresholds require human approval (unless auto-approve is on).</p>

            <div className="space-y-2 mb-4">
              {rules.map((rule, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground">{rule.action}</span>
                    <span className="text-xs text-muted-foreground mx-2">above</span>
                    <span className="text-xs font-bold text-primary">{rule.threshold}</span>
                    <span className="text-xs text-muted-foreground mx-2">→</span>
                    <span className="text-xs font-semibold text-yellow-600">{rule.requires}</span>
                  </div>
                  <button onClick={() => removeRule(i)} className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors">Remove</button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input value={newRule.action} onChange={e => setNewRule(r => ({ ...r, action: e.target.value }))}
                placeholder="Action (e.g. process_refund)" className="input-field text-xs flex-1" />
              <input value={newRule.threshold} onChange={e => setNewRule(r => ({ ...r, threshold: e.target.value }))}
                placeholder="Threshold (e.g. $50)" className="input-field text-xs w-32" />
              <button onClick={addRule} className="px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50">Add Rule</button>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h3 className="text-sm font-kanit font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Approval Notifications
            </h3>
            <p className="text-xs text-muted-foreground mb-4">When an agent hits a governance threshold, notifications are sent here.</p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                <Bell className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">In-App Notification</p>
                  <p className="text-[10px] text-muted-foreground">Always on — appears in the Genesis runtime dashboard</p>
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded">Always ON</span>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">Email Notification</p>
                  <input value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)}
                    placeholder="email@example.com (optional)" className="input-field text-xs mt-1" />
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">Webhook</p>
                  <input value={notifyWebhook} onChange={e => setNotifyWebhook(e.target.value)}
                    placeholder="https://your-webhook-url.com (optional)" className="input-field text-xs mt-1 font-mono" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
