import { X, Brain, Wrench, Radio, Plus, Trash2, Play, FolderOpen, Database, Loader2, Key, Save } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'

interface Props {
  node: any
  onUpdate: (id: string, data: any) => void
  onDelete: (id: string) => void
  onRun?: (agentId: string, name: string) => void
  onClose: () => void
}

export function ConfigPanel({ node, onUpdate, onDelete, onRun, onClose }: Props) {
  if (!node) return null

  const { type, data } = node
  const update = (patch: Record<string, unknown>) => onUpdate(node.id, { ...data, ...patch })

  const handleDelete = () => {
    if (!confirm(`Delete this ${type}?`)) return
    onDelete(node.id)
    onClose()
  }

  return (
    <div className="w-[300px] border-l border-border bg-card flex flex-col overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === 'agent' && <Brain className="w-4 h-4 text-blue-500" />}
          {type === 'tool' && <Wrench className="w-4 h-4 text-teal-500" />}
          {type === 'bus' && <Radio className="w-4 h-4 text-amber-500" />}
          <span className="text-sm font-kanit font-semibold">
            {type === 'agent' ? 'Agent Config' : type === 'tool' ? 'Tool Config' : 'Bus Config'}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {type === 'agent' && <AgentConfig data={data} update={update} />}
        {type === 'tool' && <ToolConfig data={data} update={update} />}
        {type === 'bus' && <BusConfig data={data} update={update} />}
      </div>

      <div className="px-4 py-3 border-t border-border space-y-2">
        {type === 'agent' && data._agentId && onRun && (
          <button onClick={() => onRun(data._agentId, data.name || 'Agent')}
            className="w-full py-2 rounded-lg text-xs font-semibold border border-green-500/30 text-green-600 bg-green-500/5 hover:bg-green-500/10 transition-colors flex items-center justify-center gap-1.5">
            <Play className="w-3.5 h-3.5" />
            Run Agent
          </button>
        )}
        <button onClick={handleDelete}
          className="w-full py-2 rounded-lg text-xs font-semibold bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/15 transition-colors flex items-center justify-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5" />
          Delete {type === 'agent' ? 'Agent' : type === 'tool' ? 'Tool' : 'Bus'}
        </button>
      </div>
    </div>
  )
}

function AgentConfig({ data, update }: { data: any; update: (p: any) => void }) {
  const mode = data.llmConfig?.mode || 'simple'

  return (
    <>
      <Field label="Agent Name">
        <input value={data.name || ''} onChange={e => update({ name: e.target.value })}
          className="input-field text-sm" placeholder="e.g. Customer Service Bot" />
      </Field>

      <Field label="System Prompt">
        <textarea value={data.systemPrompt || ''} onChange={e => update({ systemPrompt: e.target.value })}
          className="input-field text-sm resize-none min-h-[100px]" placeholder="You are a helpful customer service agent..." />
      </Field>

      <Field label="Config Mode">
        <div className="flex gap-1.5">
          {(['simple', 'role', 'custom'] as const).map(m => (
            <button key={m} onClick={() => update({ llmConfig: { ...data.llmConfig, mode: m } })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                mode === m ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'
              }`}>
              {m === 'simple' ? 'Simple' : m === 'role' ? 'Role' : 'Custom'}
            </button>
          ))}
        </div>
      </Field>

      {mode === 'role' && (
        <Field label="LLM Role">
          <select value={data.llmConfig?.role || 'language'}
            onChange={e => update({ llmConfig: { ...data.llmConfig, role: e.target.value } })}
            className="input-field text-sm">
            <option value="reasoning">Reasoning</option>
            <option value="language">Language</option>
            <option value="coder">Coder</option>
          </select>
        </Field>
      )}

      {mode === 'custom' && (
        <Field label="Custom Model URL">
          <input value={data.llmConfig?.customUrl || ''} onChange={e => update({ llmConfig: { ...data.llmConfig, customUrl: e.target.value } })}
            className="input-field text-sm font-mono" placeholder="https://api.example.com/v1" />
        </Field>
      )}

      <Field label={`Temperature: ${(data.llmConfig?.temperature ?? 0.7).toFixed(1)}`}>
        <input type="range" min="0" max="2" step="0.1" value={data.llmConfig?.temperature ?? 0.7}
          onChange={e => update({ llmConfig: { ...data.llmConfig, temperature: parseFloat(e.target.value) } })}
          className="w-full accent-primary" />
      </Field>

      <Field label="Max Tokens">
        <input type="number" value={data.llmConfig?.maxTokens ?? 2048}
          onChange={e => update({ llmConfig: { ...data.llmConfig, maxTokens: parseInt(e.target.value) || 2048 } })}
          className="input-field text-sm font-mono" />
      </Field>

      <Field label="Runtime">
        <div className="flex gap-1.5">
          {(['on-demand', 'always-on'] as const).map(t => (
            <button key={t} onClick={() => update({ runtime: { ...data.runtime, type: t } })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                (data.runtime?.type || 'on-demand') === t ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'
              }`}>
              {t === 'on-demand' ? 'On-Demand' : 'Always-On'}
            </button>
          ))}
        </div>
      </Field>

      {data._agentId && <KnowledgeSources agentId={data._agentId} knowledgePaths={data._knowledgePaths || []} />}
    </>
  )
}

const SECRET_SUGGESTIONS = [
  'OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY',
  'NVIDIA_API_KEY', 'HUGGINGFACE_API_KEY',
  'OLLAMA_TUNNEL_URL', 'OLLAMA_TUNNEL_AUTH_TOKEN', 'OLLAMA_LOCAL_URL',
  'GOOGLE_OAUTH_TOKEN', 'GOOGLE_CALENDAR_API_KEY', 'HUBSPOT_TOKEN',
  'SALESFORCE_TOKEN', 'SALESFORCE_INSTANCE_URL', 'STRIPE_SECRET_KEY',
  'QUICKBOOKS_TOKEN', 'QUICKBOOKS_REALM_ID',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
  'MONGODB_URI', 'SHOPIFY_TOKEN', 'GITHUB_TOKEN',
]

function AgentSecrets({ agentId }: { agentId?: string }) {
  const [rows, setRows] = useState<{ key: string; value: string; masked: string; isSet: boolean }[]>([])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [showValues, setShowValues] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!agentId) { setRows([]); return }
    api.get(`/agents/${agentId}/secrets`)
      .then(({ data }) => {
        if (data.ok && data.secrets) {
          const entries = Object.entries(data.secrets as Record<string, { set: boolean; masked: string | null }>)
          if (entries.length > 0) {
            setRows(entries.map(([k, info]) => ({
              key: k,
              value: '',
              masked: info.masked || '',
              isSet: info.set,
            })))
          } else {
            setRows([{ key: '', value: '', masked: '', isSet: false }])
          }
        }
      })
      .catch(() => {})
  }, [agentId])

  const addRow = () => setRows(prev => [...prev, { key: '', value: '', masked: '', isSet: false }])

  const removeRow = (i: number) => {
    setRows(prev => prev.filter((_, idx) => idx !== i))
    setShowValues(prev => { const n = { ...prev }; delete n[i]; return n })
  }

  const updateRow = (i: number, field: 'key' | 'value', val: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val, ...(field === 'value' && val ? { isSet: true } : {}) } : r))
  }

  const toggleShow = (i: number) => setShowValues(prev => ({ ...prev, [i]: !prev[i] }))

  const handleSave = async () => {
    if (!agentId) return
    setSaving(true)
    setStatus(null)
    try {
      const secrets: Record<string, string | null> = {}
      for (const r of rows) {
        if (r.key.trim() && r.value) {
          secrets[r.key.trim()] = r.value
        }
      }
      // Also mark deleted rows (keys that existed but were removed)
      if (Object.keys(secrets).length === 0 && rows.length === 0) {
        // clear all
      }
      const { data } = await api.put(`/agents/${agentId}/secrets`, { secrets })
      if (data.ok) {
        setStatus('Saved')
        // Reload to get fresh masked values
        const reload = await api.get(`/agents/${agentId}/secrets`)
        if (reload.data.ok && reload.data.secrets) {
          const entries = Object.entries(reload.data.secrets as Record<string, { set: boolean; masked: string | null }>)
          if (entries.length > 0) {
            setRows(entries.map(([k, info]) => ({ key: k, value: '', masked: info.masked || '', isSet: info.set })))
          }
        }
      } else {
        setStatus('Error')
      }
    } catch {
      setStatus('Error')
    } finally {
      setSaving(false)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Key className="w-3.5 h-3.5 text-amber-500" />
        <label className="block text-[0.7rem] font-medium text-muted-foreground">
          Secrets & API Keys
        </label>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">Agent-specific keys (override global settings)</p>

      {!agentId ? (
        <div className="rounded-lg bg-muted border border-border px-3 py-2.5 text-xs text-muted-foreground">
          Deploy the project first to configure agent secrets.
        </div>
      ) : (
        <div className="space-y-2">
          <datalist id="secret-suggestions">
            {SECRET_SUGGESTIONS.map(s => <option key={s} value={s} />)}
          </datalist>

          {rows.map((row, i) => (
            <div key={i} className="space-y-1">
              <div className="flex gap-1.5 items-center">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.isSet ? 'bg-green-500' : 'bg-neutral-500'}`} />
                <input
                  list="secret-suggestions"
                  value={row.key}
                  onChange={e => updateRow(i, 'key', e.target.value)}
                  className="input-field text-xs font-mono flex-1"
                  placeholder="KEY_NAME"
                />
                <button onClick={() => removeRow(i)} className="p-1 rounded hover:bg-destructive/10 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex gap-1.5 items-center ml-3">
                <input
                  type={showValues[i] ? 'text' : 'password'}
                  value={row.value}
                  onChange={e => updateRow(i, 'value', e.target.value)}
                  className="input-field text-xs font-mono flex-1"
                  placeholder={row.isSet && row.masked ? row.masked : 'paste value here'}
                />
                <button onClick={() => toggleShow(i)} className="p-1 rounded hover:bg-accent transition-colors shrink-0" title={showValues[i] ? 'Hide' : 'Show'}>
                  {showValues[i]
                    ? <X className="w-3 h-3 text-muted-foreground" />
                    : <Key className="w-3 h-3 text-muted-foreground" />
                  }
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-1.5">
            <button onClick={addRow}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" /> Add Secret
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-40 flex items-center gap-1">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Secrets
            </button>
          </div>

          {status && (
            <p className={`text-[10px] font-semibold ${status === 'Saved' ? 'text-green-500' : 'text-red-500'}`}>
              {status === 'Saved' ? 'Secrets saved successfully' : 'Failed to save secrets'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function KnowledgeSources({ agentId, knowledgePaths }: { agentId: string; knowledgePaths: string[] }) {
  const [stats, setStats] = useState<{ totalChunks: number; totalFiles: number } | null>(null)
  const [ingesting, setIngesting] = useState(false)
  const [logs, setLogs] = useState<{ type: string; message: string }[]>([])
  const [folderInput, setFolderInput] = useState('')
  const logsEndRef = useRef<HTMLDivElement>(null)
  const token = localStorage.getItem('brain_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  useEffect(() => {
    fetch(`/genesis/api/agents/${agentId}/knowledge`, { headers })
      .then(r => r.json())
      .then(d => { if (d.ok) setStats({ totalChunks: d.totalChunks, totalFiles: d.totalFiles }) })
      .catch(() => {})
  }, [agentId])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleIngest = async () => {
    const folderPath = folderInput.trim()
    if (!folderPath || ingesting) return
    setIngesting(true)
    setLogs([{ type: 'status', message: 'Starting ingestion...' }])

    try {
      const r = await fetch(`/genesis/api/agents/${agentId}/ingest`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ folderPath }),
      })

      const reader = r.body?.getReader()
      if (!reader) { setLogs(prev => [...prev, { type: 'error', message: 'No response stream' }]); setIngesting(false); return }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parse SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            setLogs(prev => [...prev, { type: event.type, message: event.message || '' }])
            if (event.type === 'complete') {
              setStats({ totalChunks: event.chunks || 0, totalFiles: event.files || 0 })
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      setLogs(prev => [...prev, { type: 'error', message: `Connection failed: ${e}` }])
    } finally {
      setIngesting(false)
    }
  }

  const handleClear = async () => {
    if (!confirm('Clear all knowledge for this agent?')) return
    try {
      await fetch(`/genesis/api/agents/${agentId}/knowledge`, { method: 'DELETE', headers })
      setStats({ totalChunks: 0, totalFiles: 0 })
      setLogs([{ type: 'status', message: 'Knowledge cleared' }])
    } catch {}
  }

  const logColor = (type: string) => {
    if (type === 'error' || type === 'chunk_error') return 'text-red-500'
    if (type === 'file_done' || type === 'done' || type === 'complete') return 'text-emerald-500'
    if (type === 'file_start') return 'text-blue-500'
    if (type === 'chunk_progress') return 'text-muted-foreground'
    return 'text-foreground/70'
  }

  return (
    <Field label="Knowledge Base (RAG)">
      <div className="space-y-2">
        {stats && (
          <div className="flex items-center gap-2 text-xs">
            <Database className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">{stats.totalChunks} chunks from {stats.totalFiles} files</span>
            {stats.totalChunks > 0 && (
              <button onClick={handleClear} className="ml-auto text-[10px] text-destructive hover:underline">Clear</button>
            )}
          </div>
        )}

        {knowledgePaths.length > 0 && (
          <div className="text-[10px] text-muted-foreground">
            Connected sources: {knowledgePaths.join(', ')}
          </div>
        )}

        <div className="flex gap-1.5">
          <input
            value={folderInput}
            onChange={e => setFolderInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleIngest()}
            className="input-field text-sm font-mono flex-1"
            placeholder="C:/support-docs/"
            disabled={ingesting}
          />
          <button
            onClick={handleIngest}
            disabled={ingesting || !folderInput.trim()}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            {ingesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
            Ingest
          </button>
        </div>

        {/* Live ingestion logs */}
        {logs.length > 0 && (
          <div className="rounded-lg bg-neutral-950 border border-border overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1 border-b border-border/50">
              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">Ingestion Log</span>
              {!ingesting && logs.length > 0 && (
                <button onClick={() => setLogs([])} className="text-[9px] text-neutral-500 hover:text-neutral-300">Clear</button>
              )}
            </div>
            <div className="max-h-[200px] overflow-y-auto p-2 font-mono text-[10px] space-y-0.5">
              {logs.map((log, i) => (
                <div key={i} className={`leading-relaxed ${logColor(log.type)}`}>
                  {log.message}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Ingest a folder to build the agent's knowledge base. Supports PDF, DOCX, XLSX, and all text files.
        </p>
      </div>
    </Field>
  )
}

function ToolConfig({ data, update }: { data: any; update: (p: any) => void }) {
  const toolName = data.toolName || 'unknown'
  const needsPath = ['read_folder', 'read_file', 'search_code', 'list_directory'].includes(toolName)

  return (
    <>
      <Field label="Tool Name">
        <div className="input-field text-sm font-mono bg-muted">{toolName}</div>
      </Field>
      <Field label="Category">
        <span className="chip chip-cyan text-xs">{data.category || 'Tool'}</span>
      </Field>
      <Field label="Description">
        <p className="text-sm text-muted-foreground">{data.description || 'No description'}</p>
      </Field>
      {needsPath && (
        <Field label="Folder / File Path">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={data.config?.path || ''}
              onChange={e => update({ config: { ...data.config, path: e.target.value } })}
              className="input-field text-sm font-mono flex-1"
              placeholder="C:/support-docs/"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Set the folder path this tool will operate on. Connected agents will use this as a knowledge source.
          </p>
        </Field>
      )}
    </>
  )
}

function BusConfig({ data, update }: { data: any; update: (p: any) => void }) {
  const [newTopic, setNewTopic] = useState('')
  const topics: string[] = data.topics || []

  const addTopic = () => {
    if (!newTopic.trim() || topics.includes(newTopic.trim())) return
    update({ topics: [...topics, newTopic.trim()] })
    setNewTopic('')
  }

  const removeTopic = (t: string) => {
    update({ topics: topics.filter((x: string) => x !== t) })
  }

  return (
    <>
      <Field label="Bus Name">
        <input value={data.name || ''} onChange={e => update({ name: e.target.value })}
          className="input-field text-sm" placeholder="e.g. Event Bus" />
      </Field>

      <Field label="Topics">
        <div className="flex gap-1.5 mb-2">
          <input value={newTopic} onChange={e => setNewTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTopic()}
            className="input-field text-sm flex-1 font-mono" placeholder="topic_name" />
          <button onClick={addTopic} className="btn-primary text-xs px-2.5 py-1.5">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-1">
          {topics.map((t: string) => (
            <div key={t} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/20">
              <span className="text-xs font-mono text-amber-700">{t}</span>
              <button onClick={() => removeTopic(t)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </Field>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[0.7rem] font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}
