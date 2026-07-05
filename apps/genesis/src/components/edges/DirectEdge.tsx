import { BaseEdge, getBezierPath } from '@xyflow/react'

export function DirectEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label }: any) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#3b82f6', strokeWidth: 2.5 }} />
      {label && (
        <foreignObject x={labelX - 40} y={labelY - 10} width={80} height={20} style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 5, color: '#2563eb', fontSize: 9, fontWeight: 700, textAlign: 'center', padding: '1px 6px', whiteSpace: 'nowrap', fontFamily: 'Kanit, sans-serif' }}>
            {label}
          </div>
        </foreignObject>
      )}
    </>
  )
}
