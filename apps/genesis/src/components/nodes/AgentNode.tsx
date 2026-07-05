import { Handle, Position } from '@xyflow/react'
import { Brain } from 'lucide-react'

const STATUS_STYLES: Record<string, { dot: string; label: string; bg: string }> = {
  running: { dot: 'bg-green-500 animate-pulse', label: 'Running', bg: 'bg-green-500/10 text-green-600 border-green-500/20' },
  idle: { dot: 'bg-blue-400', label: 'Idle', bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  error: { dot: 'bg-red-500', label: 'Error', bg: 'bg-red-500/10 text-red-600 border-red-500/20' },
  stopped: { dot: 'bg-gray-400', label: 'Stopped', bg: 'bg-muted text-muted-foreground border-border' },
  waiting_approval: { dot: 'bg-yellow-500 animate-pulse', label: 'Waiting', bg: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
}

export function AgentNode({ data, selected }: any) {
  const agentStatus = data._agentStatus
  const statusStyle = agentStatus ? STATUS_STYLES[agentStatus] || STATUS_STYLES.idle : null

  return (
    <div className={`bg-card rounded-xl border-2 transition-all min-w-[200px] max-w-[240px] shadow-sm ${
      selected ? 'border-blue-500 shadow-blue-500/20 shadow-md' : 'border-blue-400/60'
    }`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white" />

      <div className="bg-blue-500/[0.08] px-3 py-2 border-b border-blue-500/15 rounded-t-[10px] flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusStyle ? statusStyle.dot : 'bg-blue-500'}`} />
        <span className="text-[10px] font-bold text-blue-700 font-kanit tracking-wide">AGENT</span>
        {statusStyle && (
          <span className={`ml-auto text-[8px] font-semibold px-1.5 py-0.5 rounded border ${statusStyle.bg}`}>
            {statusStyle.label}
          </span>
        )}
        {!statusStyle && data.runtime?.type === 'always-on' && (
          <span className="ml-auto text-[8px] font-semibold px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 border border-green-500/20">LIVE</span>
        )}
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <p className="text-sm font-bold text-foreground font-kanit truncate">{data.name || 'New Agent'}</p>
        </div>
        {data.systemPrompt && (
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{data.systemPrompt}</p>
        )}
        {data.llmConfig?.model && (
          <div className="mt-1.5">
            <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{data.llmConfig.model}</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white" />
    </div>
  )
}
