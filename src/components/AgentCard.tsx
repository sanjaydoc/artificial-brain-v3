import { useState } from 'react'

interface AgentCardProps {
  name: string
  systemPrompt: string
  role: string
  projectId?: string
  agentId?: string
  preview?: boolean
  onRunResult?: (output: string) => void
}

const ROLE_COLORS: Record<string, string> = {
  language: 'bg-primary/10 text-primary border-primary/20',
  reasoning: 'bg-primary/10 text-primary border-primary/20',
  coder: 'bg-primary/10 text-primary border-primary/20',
}

export function AgentCard({ name, systemPrompt, role, projectId, agentId, preview, onRunResult }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState('')

  const handleRun = async () => {
    if (!agentId || running) return
    setRunning(true)
    setRunError('')
    try {
      const token = localStorage.getItem('brain_token')
      const r = await fetch(`/genesis/api/agents/${agentId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ input: '', trigger: 'manual' }),
      })
      const d = await r.json()
      if (d.ok && d.run?.output) {
        onRunResult?.(d.run.output)
      } else {
        setRunError(d.error || d.run?.lastError || 'Agent run failed')
      }
    } catch (e) {
      setRunError(String(e))
    } finally {
      setRunning(false)
    }
  }

  const promptPreview = expanded ? systemPrompt : systemPrompt.slice(0, 150) + (systemPrompt.length > 150 ? '...' : '')

  return (
    <div className="max-w-[420px] rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary font-kanit font-bold text-sm">
          A
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-kanit font-semibold text-foreground truncate">{name}</div>
          <span className={`inline-block px-1.5 py-0.5 rounded text-[0.6rem] font-mono font-medium border ${ROLE_COLORS[role] || ROLE_COLORS.language}`}>
            {role}
          </span>
        </div>
      </div>

      {/* System prompt */}
      <div>
        <div className="text-[0.6rem] font-kanit uppercase tracking-wider text-muted-foreground mb-1">System Prompt</div>
        <div className="text-[0.7rem] text-foreground/80 leading-relaxed font-poppins">
          {promptPreview}
        </div>
        {systemPrompt.length > 150 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[0.6rem] text-primary hover:underline mt-0.5"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Error */}
      {runError && (
        <div className="text-[0.6rem] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-2 py-1">
          {runError}
        </div>
      )}

      {/* Actions */}
      {preview ? (
        <div className="text-[0.6rem] text-muted-foreground">
          <a href="/login" className="text-primary hover:underline">Log in</a> to save this agent to your Genesis projects.
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={running || !agentId}
            className="px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {running ? 'Running...' : 'Run now'}
          </button>
          {projectId && (
            <a
              href={`/genesis/canvas/${projectId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-muted-foreground bg-muted border border-border hover:bg-accent hover:text-foreground transition-colors"
            >
              Open in Genesis
            </a>
          )}
        </div>
      )}
    </div>
  )
}
