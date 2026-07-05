import { Handle, Position } from '@xyflow/react'
import { Wrench } from 'lucide-react'

const CAT_COLORS: Record<string, string> = {
  File: '#3b82f6', Folder: '#8b5cf6', 'Move/Copy': '#06b6d4', Search: '#14b8a6',
  Archive: '#f59e0b', Git: '#f97316', Scripts: '#ef4444', System: '#16a34a',
  Network: '#2563eb', Desktop: '#7c3aed', Web: '#ec4899', Meta: '#6b7280',
}

export function ToolNode({ data, selected }: any) {
  const catColor = CAT_COLORS[data.category] || '#14b8a6'

  return (
    <div className={`bg-card rounded-xl border-2 transition-all min-w-[160px] max-w-[200px] shadow-sm ${
      selected ? 'border-teal-500 shadow-teal-500/20 shadow-md' : 'border-teal-400/60'
    }`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white" />

      <div className="px-3 py-1.5 border-b flex items-center gap-2 rounded-t-[10px]"
        style={{ background: `${catColor}08`, borderColor: `${catColor}15` }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: catColor }} />
        <span className="text-[10px] font-bold font-kanit tracking-wide" style={{ color: catColor }}>TOOL</span>
        <span className="ml-auto text-[8px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{data.category || 'Tool'}</span>
      </div>

      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Wrench className="w-3 h-3 text-teal-500 shrink-0" />
          <p className="text-xs font-bold text-foreground font-mono truncate">{data.toolName || 'tool'}</p>
        </div>
        {data.description && (
          <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-2">{data.description}</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white" />
    </div>
  )
}
