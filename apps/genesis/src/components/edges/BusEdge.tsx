import { BaseEdge, getBezierPath } from '@xyflow/react'

export function BusEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, data }: any) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  const isPublish = data?.direction === 'publish'
  const color = isPublish ? '#f59e0b' : '#22c55e'
  const labelText = label || (isPublish ? 'publish' : 'subscribe')

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: color, strokeWidth: 2 }} />
      <foreignObject x={labelX - 35} y={labelY - 10} width={70} height={20} style={{ overflow: 'visible', pointerEvents: 'none' }}>
        <div style={{ background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 5, color, fontSize: 9, fontWeight: 700, textAlign: 'center', padding: '1px 6px', whiteSpace: 'nowrap', fontFamily: 'Kanit, sans-serif' }}>
          {labelText}
        </div>
      </foreignObject>
    </>
  )
}
