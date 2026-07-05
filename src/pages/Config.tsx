import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'

type Tab = 'nodes' | 'routes' | 'presets' | 'memory'

interface NodeCfg {
  enabled: boolean
  model?: string
  rl_blend?: number
  decay?: number
  sim_threshold?: number
  max_habits?: number
  check_interval?: number
  conflict_threshold?: number
  ping_interval?: number
  sim_model?: string
  [key: string]: unknown
}

interface BrainConfig {
  nodes: Record<string, NodeCfg>
  routes: Record<string, boolean>
  presets: Record<string, unknown>
  updated_at?: number
}

const NODE_META: { id: string; label: string; color: string; paramKey?: string; paramLabel?: string; paramMin?: number; paramMax?: number; paramStep?: number; models?: string[] }[] = [
  { id: 'prefrontal', label: 'Prefrontal', color: '#22d3ee', models: ['richardyoung/kimi-vl-a3b-thinking:q4_k_m', 'qwen2.5:7b'] },
  { id: 'hippocampus', label: 'Hippocampus', color: '#4ade80' },
  { id: 'amygdala', label: 'Amygdala', color: '#f472b6', paramKey: 'decay', paramLabel: 'Decay', paramMin: 0.1, paramMax: 1, paramStep: 0.05 },
  { id: 'cerebellum', label: 'Cerebellum', color: '#00d4ff', paramKey: 'rl_blend', paramLabel: 'RL blend', paramMin: 0, paramMax: 1, paramStep: 0.01 },
  { id: 'broca', label: 'Broca', color: '#a78bfa', models: ['qwen2.5:7b', 'qwen2.5-coder:7b', 'richardyoung/kimi-vl-a3b-thinking:q4_k_m'] },
  { id: 'wernicke', label: 'Wernicke', color: '#818cf8', paramKey: 'sim_threshold', paramLabel: 'Sim threshold', paramMin: 0, paramMax: 1, paramStep: 0.05 },
  { id: 'visual_cortex', label: 'Visual Cortex', color: '#38bdf8', models: ['moondream:latest', 'llava'] },
  { id: 'temporal_lobe', label: 'Temporal Lobe', color: '#34d399' },
  { id: 'parietal_lobe', label: 'Parietal Lobe', color: '#fbbf24' },
  { id: 'thalamus', label: 'Thalamus', color: '#ffffff' },
  { id: 'basal_ganglia', label: 'Basal Ganglia', color: '#f87171', paramKey: 'max_habits', paramLabel: 'Max habits', paramMin: 10, paramMax: 500, paramStep: 1 },
  { id: 'insula', label: 'Insula', color: '#c084fc', paramKey: 'check_interval', paramLabel: 'Check interval (s)', paramMin: 5, paramMax: 120, paramStep: 1 },
  { id: 'cingulate', label: 'Cingulate', color: '#86efac', paramKey: 'conflict_threshold', paramLabel: 'Conflict threshold', paramMin: -2, paramMax: 0, paramStep: 0.1 },
  { id: 'brainstem', label: 'Brainstem', color: '#94a3b8', paramKey: 'ping_interval', paramLabel: 'Ping interval (s)', paramMin: 5, paramMax: 60, paramStep: 1 },
  { id: 'motor_cortex', label: 'Motor Cortex', color: '#fb923c', models: ['llama3.2:latest', 'qwen2.5:7b', 'llama3.1:8b'] },
]

const BUILTIN_PRESETS: { name: string; desc: string }[] = [
  { name: 'Full Brain', desc: 'All 15 nodes active' },
  { name: 'Motor Only', desc: 'Pure motor control (5 nodes)' },
  { name: 'Language Mode', desc: 'Chat & memory only (6 nodes)' },
  { name: 'Limbic Loop', desc: 'Emotion & habit (6 nodes)' },
  { name: 'Minimal', desc: 'Bare survival (3 nodes)' },
  { name: 'No Feedback', desc: 'All nodes, habit/conflict loops cut' },
]

export default function Config() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('nodes')
  const [config, setConfig] = useState<BrainConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [dirty, setDirty] = useState(false)

  // Memory tab
  const [memStats, setMemStats] = useState<string>('')
  const [memStatus, setMemStatus] = useState('')

  // Cerebellum RL
  const [rlRunning, setRlRunning] = useState(false)
  const [rlMode, setRlMode] = useState('')
  const [rlSteps, setRlSteps] = useState(0)
  const [rlStatus, setRlStatus] = useState('')

  // Presets
  const [presetName, setPresetName] = useState('')
  const [activePreset, setActivePreset] = useState('')
  const [presetStatus, setPresetStatus] = useState('')

  // Routes - custom wire
  const [wireFrom, setWireFrom] = useState('')
  const [wireTo, setWireTo] = useState('')
  const [wireStatus, setWireStatus] = useState('')

  const loadConfig = useCallback(async () => {
    try {
      const r = await fetch('/api/brain/config')
      const d = await r.json()
      if (d.ok) {
        setConfig(d.config)
        setDirty(false)
      } else {
        setStatus(`Error: ${d.error}`)
      }
    } catch (e) {
      setStatus(`Failed to load config: ${e}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const toggleNode = (id: string) => {
    if (!config) return
    setConfig({
      ...config,
      nodes: {
        ...config.nodes,
        [id]: { ...config.nodes[id], enabled: !config.nodes[id]?.enabled },
      },
    })
    setDirty(true)
  }

  const updateNodeParam = (id: string, key: string, value: number | string) => {
    if (!config) return
    setConfig({
      ...config,
      nodes: {
        ...config.nodes,
        [id]: { ...config.nodes[id], [key]: value },
      },
    })
    setDirty(true)
  }

  const toggleRoute = (routeKey: string) => {
    if (!config) return
    setConfig({
      ...config,
      routes: { ...config.routes, [routeKey]: !config.routes[routeKey] },
    })
    setDirty(true)
  }

  const saveNodes = async () => {
    if (!config) return
    setStatus('Saving nodes...')
    try {
      const r = await fetch('/api/brain/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: config.nodes }),
      })
      const d = await r.json()
      if (d.ok) {
        setConfig(d.config)
        setStatus('Nodes saved.')
        setDirty(false)
      } else {
        setStatus(`Error: ${d.error}`)
      }
    } catch (e) {
      setStatus(`Failed: ${e}`)
    }
  }

  const saveRoutes = async () => {
    if (!config) return
    setStatus('Saving routes...')
    try {
      const r = await fetch('/api/brain/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: config.routes }),
      })
      const d = await r.json()
      if (d.ok) {
        setConfig(d.config)
        setStatus('Routes saved.')
        setDirty(false)
      } else {
        setStatus(`Error: ${d.error}`)
      }
    } catch (e) {
      setStatus(`Failed: ${e}`)
    }
  }

  const enableAllRoutes = () => {
    if (!config) return
    const routes = { ...config.routes }
    for (const key of Object.keys(routes)) routes[key] = true
    setConfig({ ...config, routes })
    setDirty(true)
  }

  const addCustomWire = async () => {
    if (!wireFrom || !wireTo || wireFrom === wireTo) {
      setWireStatus('Select different from/to nodes')
      return
    }
    const routeKey = `${wireFrom}\u2192${wireTo}`
    if (!config) return
    setConfig({
      ...config,
      routes: { ...config.routes, [routeKey]: true },
    })
    setDirty(true)
    setWireStatus(`Added: ${routeKey}`)
    // Also persist immediately
    try {
      await fetch('/api/brain/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: { [routeKey]: true } }),
      })
    } catch { /* ignore */ }
  }

  const resetConfig = async () => {
    if (!confirm('Reset brain configuration to factory defaults?')) return
    setStatus('Resetting...')
    try {
      const r = await fetch('/api/brain/config/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Full Brain' }),
      })
      const d = await r.json()
      if (d.ok) {
        setConfig(d.config)
        setStatus('Reset to defaults.')
        setDirty(false)
      } else {
        setStatus(`Error: ${d.error}`)
      }
    } catch (e) {
      setStatus(`Failed: ${e}`)
    }
  }

  // Presets
  const loadPreset = async (name: string) => {
    setPresetStatus(`Loading ${name}...`)
    try {
      const r = await fetch('/api/brain/config/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const d = await r.json()
      if (d.ok) {
        setConfig(d.config)
        setActivePreset(name)
        setPresetStatus(`${name} applied.`)
        setDirty(false)
      } else {
        setPresetStatus(`Error: ${d.error}`)
      }
    } catch (e) {
      setPresetStatus(`Failed: ${e}`)
    }
  }

  const savePreset = async () => {
    const name = presetName.trim()
    if (!name) return
    setPresetStatus('Saving...')
    try {
      const r = await fetch('/api/brain/config/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const d = await r.json()
      if (d.ok) {
        setPresetStatus(`Saved: ${name}`)
        setPresetName('')
        loadConfig()
      } else {
        setPresetStatus(`Error: ${d.error}`)
      }
    } catch (e) {
      setPresetStatus(`Failed: ${e}`)
    }
  }

  const deletePreset = async (name: string) => {
    if (!confirm(`Delete preset "${name}"?`)) return
    try {
      const r = await fetch(`/api/brain/config/preset/${encodeURIComponent(name)}`, { method: 'DELETE' })
      const d = await r.json()
      if (d.ok) {
        setPresetStatus(`Deleted: ${name}`)
        loadConfig()
      } else {
        setPresetStatus(`Error: ${d.error}`)
      }
    } catch (e) {
      setPresetStatus(`Failed: ${e}`)
    }
  }

  // Memory
  const refreshMemStats = async () => {
    setMemStatus('Loading...')
    try {
      const r = await fetch('/api/brain/memory/stats')
      const d = await r.json()
      if (d.stats) {
        const lines = Object.entries(d.stats as Record<string, { short?: number; long?: number }>)
          .map(([node, v]) => `  ${node.padEnd(16)} short: ${v.short ?? 0}   long: ${v.long ?? 0}`)
          .join('\n')
        setMemStats(lines || 'No memory data')
      } else {
        setMemStats(d.error || 'No data')
      }
      setMemStatus('')
    } catch (e) {
      setMemStatus(`Error: ${e}`)
    }
  }

  const brainReset = async () => {
    if (!confirm('Delete all episodic memories? Semantic graph is preserved.')) return
    setMemStatus('Resetting memories...')
    try {
      const r = await fetch('/api/brain/reset', { method: 'POST' })
      const d = await r.json()
      setMemStatus(d.ok ? 'Episodic memories cleared.' : `Error: ${d.error}`)
    } catch (e) {
      setMemStatus(`Failed: ${e}`)
    }
  }

  const brainFullReset = async () => {
    if (!confirm('FULL RESET: Erase ALL Neo4j data + restore default config. This cannot be undone!')) return
    setMemStatus('Full reset in progress...')
    try {
      const token = localStorage.getItem('brain_token')
      const r = await fetch('/api/brain/format', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      const d = await r.json()
      setMemStatus(d.ok ? 'Full reset complete.' : `Error: ${JSON.stringify(d)}`)
      loadConfig()
    } catch (e) {
      setMemStatus(`Failed: ${e}`)
    }
  }

  // Cerebellum RL
  const refreshRL = async () => {
    try {
      const r = await fetch('/api/brain/cerebellum/status')
      const d = await r.json()
      setRlRunning(d.running ?? false)
      setRlMode(d.mode ?? '')
      setRlSteps(d.steps ?? 0)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    refreshRL()
    const id = setInterval(refreshRL, 5000)
    return () => clearInterval(id)
  }, [])

  const startRL = async () => {
    setRlStatus('Starting...')
    try {
      await fetch('/api/brain/cerebellum/start', { method: 'POST' })
      setRlStatus('Started.')
      refreshRL()
    } catch (e) {
      setRlStatus(`Error: ${e}`)
    }
  }

  const stopRL = async () => {
    setRlStatus('Stopping...')
    try {
      await fetch('/api/brain/cerebellum/stop', { method: 'POST' })
      setRlStatus('Stopped.')
      refreshRL()
    } catch (e) {
      setRlStatus(`Error: ${e}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="loader" />
      </div>
    )
  }

  const builtinPresetNames = new Set(BUILTIN_PRESETS.map((p) => p.name))
  const userPresets = config
    ? Object.keys(config.presets).filter((p) => !builtinPresetNames.has(p))
    : []

  const nodeIds = NODE_META.map((n) => n.id)

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-lg font-kanit font-semibold tracking-wider bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent mb-4">
        Brain Configuration
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(['nodes', 'routes', 'presets', 'memory'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-kanit font-bold uppercase tracking-wider transition-all ${
              tab === t
                ? 'bg-primary/15 border border-primary/30 text-primary'
                : 'bg-muted border border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* NODES TAB */}
      {tab === 'nodes' && config && (
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="py-2 px-2 w-8">#</th>
                  <th className="py-2 px-2">Node</th>
                  <th className="py-2 px-2 w-16">Status</th>
                  <th className="py-2 px-2">Model / Key Param</th>
                  <th className="py-2 px-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {NODE_META.map((meta, i) => {
                  const ncfg = config.nodes[meta.id] || { enabled: true }
                  return (
                    <tr key={meta.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-2.5 px-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                          <span className="font-kanit font-semibold" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <button
                          onClick={() => toggleNode(meta.id)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${
                            ncfg.enabled ? 'bg-emerald-500' : 'bg-muted'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                              ncfg.enabled ? 'left-[22px]' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground">
                        {meta.models ? 'Model' : meta.paramLabel || '\u2014'}
                      </td>
                      <td className="py-2.5 px-2">
                        {meta.models ? (
                          <select
                            value={ncfg.model || meta.models[0]}
                            onChange={(e) => updateNodeParam(meta.id, 'model', e.target.value)}
                            className="bg-muted border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                          >
                            {meta.models.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : meta.paramKey ? (
                          <input
                            type="number"
                            value={ncfg[meta.paramKey] as number ?? ''}
                            min={meta.paramMin}
                            max={meta.paramMax}
                            step={meta.paramStep}
                            onChange={(e) => updateNodeParam(meta.id, meta.paramKey!, +e.target.value)}
                            className="w-20 bg-muted border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        ) : (
                          <span className="text-muted-foreground">{'\u2014'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={saveNodes}
              disabled={!dirty}
              className="px-5 py-2 rounded-lg bg-primary/15 border border-primary/25 text-primary text-xs font-bold hover:bg-primary/25 transition-colors disabled:opacity-30"
            >
              Apply Changes
            </button>
            <button
              onClick={resetConfig}
              className="px-5 py-2 rounded-lg bg-muted border border-border text-muted-foreground text-xs hover:bg-accent transition-colors"
            >
              Reset to Defaults
            </button>
            {status && <span className="text-xs text-muted-foreground">{status}</span>}
          </div>
        </div>
      )}

      {/* ROUTES TAB */}
      {tab === 'routes' && config && (
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="py-2 px-2">From</th>
                  <th className="py-2 px-2 w-8"></th>
                  <th className="py-2 px-2">To</th>
                  <th className="py-2 px-2 w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(config.routes).map(([key, enabled]) => {
                  const parts = key.split('\u2192')
                  const from = parts[0] || key
                  const to = parts[1] || ''
                  const fromMeta = NODE_META.find((n) => n.id === from)
                  const toMeta = NODE_META.find((n) => n.id === to)
                  return (
                    <tr key={key} className="border-b border-border hover:bg-muted/50">
                      <td className="py-2 px-2">
                        <span style={{ color: fromMeta?.color || '#888' }}>{from}</span>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{'\u2192'}</td>
                      <td className="py-2 px-2">
                        <span style={{ color: toMeta?.color || '#888' }}>{to}</span>
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => toggleRoute(key)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${
                            enabled ? 'bg-emerald-500' : 'bg-muted'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                              enabled ? 'left-[22px]' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={saveRoutes}
              disabled={!dirty}
              className="px-5 py-2 rounded-lg bg-primary/15 border border-primary/25 text-primary text-xs font-bold hover:bg-primary/25 transition-colors disabled:opacity-30"
            >
              Apply Changes
            </button>
            <button
              onClick={enableAllRoutes}
              className="px-5 py-2 rounded-lg bg-muted border border-border text-muted-foreground text-xs hover:bg-accent transition-colors"
            >
              Enable All
            </button>
            {status && <span className="text-xs text-muted-foreground">{status}</span>}
          </div>

          {/* Custom wire */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="text-xs font-kanit uppercase tracking-widest text-primary/50 mb-3">Custom Wire</div>
            <div className="flex items-center gap-2">
              <select
                value={wireFrom}
                onChange={(e) => setWireFrom(e.target.value)}
                className="bg-muted border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">From node</option>
                {nodeIds.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
              <span className="text-muted-foreground">{'\u2192'}</span>
              <select
                value={wireTo}
                onChange={(e) => setWireTo(e.target.value)}
                className="bg-muted border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">To node</option>
                {nodeIds.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
              <button
                onClick={addCustomWire}
                className="px-4 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs hover:bg-primary/15 transition-colors"
              >
                Add Wire
              </button>
            </div>
            {wireStatus && <div className="mt-2 text-xs text-muted-foreground">{wireStatus}</div>}
          </div>
        </div>
      )}

      {/* PRESETS TAB */}
      {tab === 'presets' && config && (
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="text-xs font-kanit uppercase tracking-widest text-primary/50 mb-3">Built-in Presets</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {BUILTIN_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => loadPreset(p.name)}
                className={`rounded-lg border px-3 py-3 text-left transition-all ${
                  activePreset === p.name
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border bg-muted hover:bg-accent'
                }`}
              >
                <div className="text-sm font-kanit font-bold text-foreground">{p.name}</div>
                <div className="text-[0.6rem] text-muted-foreground mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>

          {/* Save custom */}
          <div className="border-t border-border pt-4 mb-4">
            <div className="text-xs font-kanit uppercase tracking-widest text-primary/50 mb-2">Save Current Config As Preset</div>
            <div className="flex items-center gap-2">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value.slice(0, 40))}
                placeholder="Preset name..."
                className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={savePreset}
                disabled={!presetName.trim()}
                className="px-4 py-2 rounded-lg bg-primary/15 border border-primary/25 text-primary text-xs font-bold hover:bg-primary/25 transition-colors disabled:opacity-30"
              >
                Save
              </button>
            </div>
          </div>

          {/* User presets */}
          {userPresets.length > 0 && (
            <div className="border-t border-border pt-4">
              <div className="text-xs font-kanit uppercase tracking-widest text-primary/50 mb-2">My Saved Presets</div>
              <div className="space-y-1.5">
                {userPresets.map((name) => (
                  <div key={name} className="flex items-center gap-2 rounded-lg bg-muted border border-border px-3 py-2">
                    <span className="flex-1 text-sm text-foreground">{name}</span>
                    <button
                      onClick={() => loadPreset(name)}
                      className="px-3 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-[0.65rem] hover:bg-primary/15"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deletePreset(name)}
                      className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      {'\u2715'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {presetStatus && <div className="mt-3 text-xs text-muted-foreground">{presetStatus}</div>}
        </div>
      )}

      {/* MEMORY TAB */}
      {tab === 'memory' && (
        <div className="space-y-4">
          {/* Memory stats */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="text-xs font-kanit uppercase tracking-widest text-primary/50 mb-3">Memory Statistics</div>
            <pre className="bg-muted rounded-lg p-3 text-xs font-mono text-foreground whitespace-pre overflow-x-auto min-h-[80px]">
              {memStats || 'Click "Refresh Stats" to load'}
            </pre>
            <button
              onClick={refreshMemStats}
              className="mt-3 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs hover:bg-primary/15 transition-colors"
            >
              Refresh Stats
            </button>
          </div>

          {/* Brain reset — admin only */}
          {isAdmin && (
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="text-xs font-kanit uppercase tracking-widest text-red-500/60 mb-3">Brain Reset</div>
              <p className="text-xs text-muted-foreground mb-3">
                <strong className="text-foreground">Reset Memory</strong> deletes all episodic :Memory nodes. The semantic concept graph is preserved.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                <strong className="text-red-500">Full Reset</strong> wipes ALL Neo4j data (memories + concepts) and restores default brain config. Cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={brainReset}
                  className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  Reset Memory
                </button>
                <button
                  onClick={brainFullReset}
                  className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  Full Reset
                </button>
              </div>
              {memStatus && <div className="mt-3 text-xs text-muted-foreground">{memStatus}</div>}
            </div>
          )}

          {/* Cerebellum RL — admin only */}
          {isAdmin && (
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="text-xs font-kanit uppercase tracking-widest text-primary/50 mb-3">Cerebellum (Motor RL)</div>
              <div className="bg-muted rounded-lg px-3 py-2 mb-3 text-xs font-mono">
                <span className="text-muted-foreground">Status: </span>
                <span className={rlRunning ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {rlRunning ? 'RUNNING' : 'STOPPED'}
                </span>
                {rlMode && <span className="text-muted-foreground ml-3">Mode: {rlMode}</span>}
                {rlSteps > 0 && <span className="text-muted-foreground ml-3">Steps: {rlSteps}</span>}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={startRL}
                  disabled={rlRunning}
                  className="px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Start
                </button>
                <button
                  onClick={stopRL}
                  disabled={!rlRunning}
                  className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  Stop
                </button>
              </div>
              {rlStatus && <div className="mt-2 text-xs text-muted-foreground">{rlStatus}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
