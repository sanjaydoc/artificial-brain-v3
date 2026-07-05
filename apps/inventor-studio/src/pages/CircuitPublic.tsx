// Ported from inventor-studio-react-app/src/pages/CircuitPublic.jsx (224 lines).
// Public read-only view of shared circuits. No auth required (backend uses
// optionalAuth + isPublic check). Uses the same v3 → source data-shape adapter
// as CircuitCanvas.tsx.
import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { api } from '@/lib/api'

const electronicsPublicGet = (id: string) => api.get(`/electronics/public/${id}`)

const CAT: Record<string, { border: string; bg: string; badge: string; text: string }> = {
  MCU:      { border: '#3b82f6', bg: 'rgba(59,130,246,0.06)', badge: 'rgba(59,130,246,0.12)', text: '#1d4ed8' },
  SENSOR:   { border: '#14b8a6', bg: 'rgba(20,184,166,0.06)', badge: 'rgba(20,184,166,0.12)', text: '#0f766e' },
  ACTUATOR: { border: '#eab308', bg: 'rgba(234,179,8,0.06)',  badge: 'rgba(234,179,8,0.12)',  text: '#92400e' },
  POWER:    { border: '#f97316', bg: 'rgba(249,115,22,0.06)', badge: 'rgba(249,115,22,0.12)', text: '#9a3412' },
  MODULE:   { border: '#a855f7', bg: 'rgba(168,85,247,0.06)', badge: 'rgba(168,85,247,0.12)', text: '#7c3aed' },
  DISPLAY:  { border: '#22c55e', bg: 'rgba(34,197,94,0.06)',  badge: 'rgba(34,197,94,0.12)',  text: '#15803d' },
}
const DEFAULT_CAT = CAT.MODULE
const CARD_W = 190, CARD_H = 205

// Same adapter as CircuitCanvas — translates v3 backend shape into source shape
function toSourceShape(v3doc: any): any {
  if (!v3doc) return null
  const c = v3doc.circuit || v3doc
  if (c.circuit_data) return c
  const nodes = c.schematic?.nodes || []
  const edges = c.schematic?.edges || []
  const bom = c.bom || []
  const bomMap: Record<string, any> = {}
  for (const b of bom) bomMap[b.id] = b
  const components = (nodes.length > 0 ? nodes : bom).map((n: any, i: number) => {
    const b = bomMap[n.id] || n
    return {
      id: n.id || b.id || `c${i}`,
      name: b.name || n.data?.name || n.label || 'Component',
      model: b.notes || n.data?.notes || '',
      type: (b.category || n.data?.category || 'MODULE').toLowerCase(),
      category: b.category || n.data?.category || 'MODULE',
      x: n.position?.x ?? n.x ?? 80 + (i % 4) * 280,
      y: n.position?.y ?? n.y ?? 80 + Math.floor(i / 4) * 300,
      pins: b.pins || n.data?.pins || [],
      quantity: b.quantity ?? n.data?.quantity ?? 1,
    }
  })
  const connections = edges.map((e: any) => ({
    from: e.source || e.from,
    to: e.target || e.to,
    fromPin: e.sourceHandle || e.fromPin,
    toPin: e.targetHandle || e.toPin,
    label: e.label || '',
    type: e.type || '',
  }))
  return {
    ...c,
    creator_email: c.creatorEmail || c.creator_email || '',
    circuit_data: { components, connections },
  }
}

function ConnectionLine({ conn, compMap }: { conn: any; compMap: any }) {
  const from = compMap[conn.from], to = compMap[conn.to]
  if (!from || !to) return null
  const dx = to.x - from.x, dy = to.y - from.y
  const offset = Math.max(60, Math.min(160, Math.abs(dx) * 0.35))
  let x1: number, y1: number, x2: number, y2: number
  let cx1: number, cy1: number, cx2: number, cy2: number
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) { x1 = from.x + CARD_W; y1 = from.y + CARD_H/2; x2 = to.x; y2 = to.y + CARD_H/2; cx1 = x1 + offset; cy1 = y1; cx2 = x2 - offset; cy2 = y2 }
    else { x1 = from.x; y1 = from.y + CARD_H/2; x2 = to.x + CARD_W; y2 = to.y + CARD_H/2; cx1 = x1 - offset; cy1 = y1; cx2 = x2 + offset; cy2 = y2 }
  } else {
    const vo = Math.max(50, Math.abs(dy) * 0.35)
    if (dy > 0) { x1 = from.x + CARD_W/2; y1 = from.y + CARD_H; x2 = to.x + CARD_W/2; y2 = to.y; cx1 = x1; cy1 = y1 + vo; cx2 = x2; cy2 = y2 - vo }
    else { x1 = from.x + CARD_W/2; y1 = from.y; x2 = to.x + CARD_W/2; y2 = to.y + CARD_H; cx1 = x1; cy1 = y1 - vo; cx2 = x2; cy2 = y2 + vo }
  }
  const color = conn.type === 'power' ? '#f97316' : '#22c55e'
  const midX = (x1 + cx1 + cx2 + x2) / 4, midY = (y1 + cy1 + cy2 + y2) / 4
  return (
    <g>
      <path d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
        fill="none" stroke={color} strokeWidth="1.8"
        strokeDasharray={conn.type === 'power' ? '7,4' : undefined} opacity="0.75" />
      <circle cx={x2} cy={y2} r="3" fill={color} opacity="0.85" />
      {conn.label && <text x={midX} y={midY - 6} fill={color} fontSize="9" textAnchor="middle" fontFamily="monospace">{conn.label}</text>}
    </g>
  )
}

function ComponentCard({ comp }: { comp: any }) {
  const cat = comp.category || 'MODULE'
  const colors = CAT[cat] || DEFAULT_CAT
  return (
    <div style={{ position: 'absolute', left: comp.x, top: comp.y, width: CARD_W,
      background: colors.bg, border: `1.5px solid ${colors.border}77`,
      borderRadius: 10, userSelect: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      <div style={{ background: colors.badge, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${colors.border}44` }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.border }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: colors.text, letterSpacing: '0.1em', fontFamily: 'Kanit,sans-serif', flex: 1 }}>{cat}</span>
        {comp.quantity > 1 && <span style={{ fontSize: 9, color: colors.text, opacity: 0.75 }}>×{comp.quantity}</span>}
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#111827', fontFamily: 'Kanit,sans-serif', marginBottom: 3 }}>{comp.name}</p>
        <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>{comp.model}</p>
        <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 6, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, fontSize: 11, color: colors.text }}>
          {comp.type?.toUpperCase() || cat}
        </div>
        {comp.pins?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {comp.pins.slice(0, 7).map((p: string, i: number) => (
              <span key={i} style={{ fontSize: 8, color: colors.text, background: colors.badge, padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>{p}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
  borderRadius: 7, color: '#555', display: 'flex', alignItems: 'center',
}

export default function CircuitPublic() {
  const { id } = useParams<{ id: string }>()
  const [circuit, setCircuit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(0.75)
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!id) return
    electronicsPublicGet(id)
      .then(({ data }: any) => setCircuit(toSourceShape(data)))
      .catch(() => setError('Circuit not found or not public.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      setZoom((z) => {
        const nz = Math.max(0.15, Math.min(3, z * factor))
        setPan((p) => ({ x: mx - (mx - p.x) * (nz / z), y: my - (my - p.y) * (nz / z) }))
        return nz
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan])
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [isDragging, dragStart])
  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  if (loading) return (
    <div className="bg-background" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loader-spinner loader-spinner-lg" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: '#555', fontSize: 12, fontFamily: 'Kanit,sans-serif' }}>Loading circuit…</p>
      </div>
    </div>
  )

  if (error || !circuit) return (
    <div className="bg-background" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6b7280', fontSize: 14 }}>{error || 'Not found.'}</p>
    </div>
  )

  const cd = circuit.circuit_data || {}
  const comps = cd.components || []
  const conns = cd.connections || []
  const compMap: Record<string, any> = Object.fromEntries(comps.map((c: any) => [c.id, c]))

  return (
    <div style={{ height: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 48, borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', background: 'rgba(255,255,255,0.98)', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', fontFamily: 'Kanit,sans-serif' }}>{circuit.title}</p>
          <p style={{ fontSize: 10, color: '#9ca3af' }}>by {circuit.creator_email?.split('@')[0] || 'anonymous'} · {comps.length} components</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setZoom((z) => Math.min(3, z * 1.2))} style={iconBtn}><ZoomIn size={15} /></button>
          <span style={{ fontSize: 11, color: '#444', minWidth: 34, textAlign: 'center', fontFamily: 'monospace', alignSelf: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.max(0.15, z * 0.8))} style={iconBtn}><ZoomOut size={15} /></button>
          <button onClick={() => { setZoom(0.75); setPan({ x: 40, y: 40 }) }} style={iconBtn}><Maximize2 size={15} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, padding: '3px 10px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, fontFamily: 'Kanit,sans-serif' }}>ASI-1 Circuit</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 200, borderRight: '1px solid rgba(0,0,0,0.08)', padding: '14px 14px', background: '#ffffff', flexShrink: 0, overflowY: 'auto' }}>
          <p style={{ fontSize: 9, color: '#444', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Kanit,sans-serif', marginBottom: 10 }}>SCHEMATIC</p>
          <p style={{ fontSize: 9, color: '#333', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>NODE TYPES</p>
          {Object.entries(CAT).map(([cat, c]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.border }} />
              <span style={{ fontSize: 11, color: '#666', fontFamily: 'Kanit,sans-serif', fontWeight: 600 }}>{cat}</span>
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#22c55e" strokeWidth="1.5" /></svg>
              <span style={{ fontSize: 11, color: '#666' }}>DATA</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#f97316" strokeWidth="1.5" strokeDasharray="4,3" /></svg>
              <span style={{ fontSize: 11, color: '#666' }}>POWER</span>
            </div>
          </div>
          <div style={{ marginTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12 }}>
            <p style={{ fontSize: 9, color: '#333', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>PARTS ({comps.length})</p>
            {comps.map((c: any, i: number) => {
              const colors = CAT[c.category || 'MODULE'] || DEFAULT_CAT
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 9, color: '#333', minWidth: 14, fontFamily: 'monospace' }}>{i + 1}</span>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: colors.border }} />
                  <span style={{ fontSize: 10, color: '#6b7280', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#f8f9fa', backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px', cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div style={{ position: 'absolute', transformOrigin: '0 0', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }} width="1" height="1">
              {conns.map((conn: any, i: number) => <ConnectionLine key={i} conn={conn} compMap={compMap} />)}
            </svg>
            {comps.map((comp: any) => <ComponentCard key={comp.id} comp={comp} />)}
          </div>
          <div style={{ position: 'absolute', bottom: 14, right: 14, fontSize: 10, color: '#9ca3af', pointerEvents: 'none' }}>
            Scroll to zoom · Drag to pan
          </div>
        </div>
      </div>
    </div>
  )
}
