import { Handle, Position } from '@xyflow/react'
import { Radio } from 'lucide-react'

export function BusNode({ data, selected }: any) {
  const topics: string[] = data.topics || []

  return (
    <div className={`bg-card rounded-xl border-2 transition-all min-w-[180px] max-w-[220px] shadow-sm ${
      selected ? 'border-amber-500 shadow-amber-500/20 shadow-md' : 'border-amber-400/60'
    }`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white" />

      <div className="bg-amber-500/[0.08] px-3 py-2 border-b border-amber-500/15 rounded-t-[10px] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-[10px] font-bold text-amber-700 font-kanit tracking-wide">MESSAGE BUS</span>
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Radio className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-sm font-bold text-foreground font-kanit truncate">{data.name || 'Event Bus'}</p>
        </div>
        {topics.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {topics.map((t) => (
              <span key={t} className="text-[9px] font-semibold font-mono px-1.5 py-0.5 rounded bg-amber-500/[0.08] text-amber-700 border border-amber-500/20">
                {t}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[9px] text-muted-foreground">No topics defined</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white" />
    </div>
  )
}
