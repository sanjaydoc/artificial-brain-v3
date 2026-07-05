// Ported from inventor-studio-react-app/src/pages/CircuitCanvas.jsx (1855 lines).
// Preserves design verbatim — all 30+ SVG component icons, dual SCH/PCB views,
// drag-drop, pinch-zoom, MiniMap, share dialog, SVG download, regenerate.
// Adds types + a compat layer at the top to translate v3 backend data shape
// (bom + schematic.nodes/edges) into the source's expected circuit_data shape.

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Share2, ZoomIn, ZoomOut, Maximize2,
  RefreshCw, Copy, Check, X, LayoutGrid,
} from 'lucide-react'
import { api } from '@/lib/api'

// ── API shims ─────────────────────────────────────────────────────────────────
const electronicsGet        = (id: string) => api.get(`/electronics/${id}`)
// v3 backend: PATCH /electronics/:id/visibility with body { isPublic }
// (legacy was /electronics/:id/share with no body — toggle on the server)
const electronicsShare      = (id: string, isPublic: boolean) =>
  api.patch(`/electronics/${id}/visibility`, { isPublic })
const electronicsRegenerate = (id: string) => api.post(`/electronics/regenerate/${id}`)

// ── v3 ↔ source data shape compat ─────────────────────────────────────────────
// Source expects: circuit.circuit_data = { components: [...], connections: [...] }
// v3 backend returns: circuit.bom = [...] + circuit.schematic = { nodes, edges }
// This converts v3 → source on read so the rest of the file stays verbatim.
function toSourceShape(v3doc: any): any {
  if (!v3doc) return null
  const c = v3doc.circuit || v3doc
  // If already source-shape, pass through
  if (c.circuit_data) return c

  const nodes = c.schematic?.nodes || []
  const edges = c.schematic?.edges || []
  const bom = c.bom || []

  // Build component list — combine schematic node positions with BOM metadata
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
      specs: b.specs || n.data?.specs || '',
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
    is_public: c.isPublic ?? c.is_public ?? false,
    circuit_data: { components, connections },
  }
}

// ── Category styles ───────────────────────────────────────────────────────────
const CAT: Record<string, { border: string; bg: string; badge: string; text: string }> = {
  MCU:      { border: '#2563eb', bg: 'rgba(37,99,235,0.06)',   badge: 'rgba(37,99,235,0.12)',   text: '#1d4ed8' },
  SENSOR:   { border: '#0d9488', bg: 'rgba(13,148,136,0.06)',  badge: 'rgba(13,148,136,0.12)',  text: '#0f766e' },
  ACTUATOR: { border: '#d97706', bg: 'rgba(217,119,6,0.06)',   badge: 'rgba(217,119,6,0.12)',   text: '#92400e' },
  POWER:    { border: '#dc2626', bg: 'rgba(220,38,38,0.06)',   badge: 'rgba(220,38,38,0.12)',   text: '#991b1b' },
  MODULE:   { border: '#7c3aed', bg: 'rgba(124,58,237,0.06)',  badge: 'rgba(124,58,237,0.12)',  text: '#5b21b6' },
  DISPLAY:  { border: '#16a34a', bg: 'rgba(22,163,74,0.06)',   badge: 'rgba(22,163,74,0.12)',   text: '#14532d' },
}
const DEFAULT_CAT = CAT.MODULE

const CARD_W = 190
const CARD_H = 205

function autoLayout(comps: any[]): any[] {
  if (!comps || comps.length === 0) return comps
  const ORDER: Record<string, number> = { MCU: 0, POWER: 1, SENSOR: 2, ACTUATOR: 3, DISPLAY: 4, MODULE: 5 }
  const sorted = [...comps].sort((a, b) => (ORDER[a.category] ?? 5) - (ORDER[b.category] ?? 5))
  const SLOT_W = CARD_W + 80
  const SLOT_H = CARD_H + 90
  const MARGIN = 50
  const MAX_ROWS = 3
  return sorted.map((comp, i) => ({
    ...comp,
    x: MARGIN + Math.floor(i / MAX_ROWS) * SLOT_W,
    y: MARGIN + (i % MAX_ROWS) * SLOT_H,
  }))
}

// ── SVG component icons (verbatim from source) ───────────────────────────────
function getIconSVG(type?: string): string {
  const t = (type || '').toLowerCase()
  if (['arduino', 'mcu', 'microcontroller', 'stm32', 'attiny'].includes(t)) return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="12" width="58" height="31" rx="3" fill="#1a472a" stroke="#2d6a4f" stroke-width="1.5"/>
      <rect x="0" y="20" width="8" height="15" rx="1" fill="#555"/>
      <rect x="7" y="22" width="3" height="11" rx="0.5" fill="#333"/>
      ${[13,20,27,34,41,48,55].map(x => `<rect x="${x}" y="8" width="2.5" height="5" rx="0.5" fill="#c8a951"/>`).join('')}
      ${[13,20,27,34,41,48,55].map(x => `<rect x="${x}" y="42" width="2.5" height="5" rx="0.5" fill="#c8a951"/>`).join('')}
      <rect x="24" y="18" width="22" height="19" rx="2" fill="#111" stroke="#333" stroke-width="1"/>
      <text x="35" y="30" text-anchor="middle" fill="#3a3" font-size="5" font-family="monospace">MCU</text>
      <circle cx="60" cy="16" r="2" fill="#f97316" opacity="0.7"/>
    </svg>`
  if (['esp32', 'esp8266'].includes(t)) return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="10" width="54" height="35" rx="3" fill="#1a2a1a" stroke="#2d6a4f" stroke-width="1.5"/>
      ${[11,17,23,29,35,41,47,53,59].map(x => `<rect x="${x}" y="7" width="2" height="4" fill="#c8a951"/>`).join('')}
      ${[11,17,23,29,35,41,47,53,59].map(x => `<rect x="${x}" y="44" width="2" height="4" fill="#c8a951"/>`).join('')}
      <rect x="18" y="16" width="34" height="23" rx="2" fill="#111" stroke="#2d6a4f" stroke-width="1"/>
      <text x="35" y="30" text-anchor="middle" fill="#22c55e" font-size="6" font-weight="bold" font-family="monospace">ESP32</text>
    </svg>`
  if (['raspberry_pi'].includes(t)) return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="8" width="60" height="39" rx="4" fill="#2d0030" stroke="#9333ea" stroke-width="1.5"/>
      <rect x="12" y="14" width="18" height="14" rx="2" fill="#111" stroke="#9333ea" stroke-width="1"/>
      <circle cx="50" cy="21" r="8" fill="#1a001a" stroke="#9333ea" stroke-width="1"/>
      <text x="50" y="25" text-anchor="middle" fill="#9333ea" font-size="6" font-weight="bold">Pi</text>
    </svg>`
  if (['battery', 'lipo', 'supercapacitor'].includes(t)) return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="13" width="48" height="29" rx="4" fill="#1a2a0a" stroke="#22c55e" stroke-width="1.5"/>
      <rect x="56" y="21" width="7" height="13" rx="2" fill="#22c55e" opacity="0.6"/>
      <rect x="14" y="19" width="11" height="17" rx="1" fill="#22c55e" opacity="0.75"/>
      <rect x="27" y="19" width="11" height="17" rx="1" fill="#22c55e" opacity="0.55"/>
      <text x="17" y="35" fill="#22c55e" font-size="9" font-weight="bold">+</text>
      <text x="48" y="34" fill="#ef4444" font-size="8" font-weight="bold">-</text>
    </svg>`
  if (['power', 'regulator', 'ldo', 'buck_converter'].includes(t)) return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="10" width="40" height="35" rx="3" fill="#1a1a0a" stroke="#f97316" stroke-width="1.5"/>
      <text x="35" y="26" text-anchor="middle" fill="#f97316" font-size="7" font-weight="bold">REG</text>
      <text x="35" y="36" text-anchor="middle" fill="#fdba74" font-size="6" font-family="monospace">3.3V</text>
    </svg>`
  if (t.startsWith('motor') || t === 'actuator' || t === 'esc' || t === 'pump' || t === 'solenoid') return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <circle cx="33" cy="27" r="21" fill="#1a1a2e" stroke="#eab308" stroke-width="1.5"/>
      <circle cx="33" cy="27" r="14" fill="#0d0d1a" stroke="#ca8a04" stroke-width="1"/>
      <text x="33" y="32" text-anchor="middle" fill="#eab308" font-size="13" font-weight="bold">M</text>
    </svg>`
  if (t.startsWith('sensor') || t === 'sensor') return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <rect x="13" y="12" width="44" height="31" rx="3" fill="#0d2b2b" stroke="#14b8a6" stroke-width="1.5"/>
      <circle cx="35" cy="27" r="8" fill="#14b8a6" opacity="0.15" stroke="#14b8a6" stroke-width="1"/>
      <circle cx="35" cy="27" r="4" fill="#14b8a6" opacity="0.5"/>
      <circle cx="35" cy="27" r="1.5" fill="#14b8a6"/>
    </svg>`
  if (['resistor'].includes(t)) return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <line x1="3" y1="27" x2="18" y2="27" stroke="#e2e8f0" stroke-width="2"/>
      <rect x="18" y="19" width="34" height="16" rx="2" fill="#1a1a1a" stroke="#e2e8f0" stroke-width="1.5"/>
      <line x1="52" y1="27" x2="67" y2="27" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="26" y1="22" x2="26" y2="32" stroke="#f97316" stroke-width="2.5"/>
      <line x1="32" y1="22" x2="32" y2="32" stroke="#fbbf24" stroke-width="2.5"/>
    </svg>`
  if (['capacitor'].includes(t)) return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <line x1="3" y1="27" x2="28" y2="27" stroke="#e2e8f0" stroke-width="2"/>
      <line x1="28" y1="14" x2="28" y2="40" stroke="#e2e8f0" stroke-width="3"/>
      <line x1="33" y1="14" x2="33" y2="40" stroke="#e2e8f0" stroke-width="3"/>
      <line x1="33" y1="27" x2="67" y2="27" stroke="#e2e8f0" stroke-width="2"/>
      <text x="56" y="20" fill="#22c55e" font-size="12" font-weight="bold">+</text>
    </svg>`
  if (['led'].includes(t)) return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <line x1="3" y1="27" x2="20" y2="27" stroke="#e2e8f0" stroke-width="2"/>
      <polygon points="20,17 20,37 38,27" fill="#fbbf24" opacity="0.8" stroke="#f59e0b" stroke-width="1"/>
      <line x1="38" y1="17" x2="38" y2="37" stroke="#f59e0b" stroke-width="2.5"/>
      <line x1="38" y1="27" x2="67" y2="27" stroke="#e2e8f0" stroke-width="2"/>
    </svg>`
  if (['display', 'lcd', 'oled', 'tft', 'led_matrix', 'epaper'].includes(t)) return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="7" width="62" height="41" rx="3" fill="#001a00" stroke="#22c55e" stroke-width="1.5"/>
      <rect x="8" y="11" width="54" height="33" rx="2" fill="#001200"/>
      <line x1="12" y1="19" x2="58" y2="19" stroke="#22c55e" stroke-width="1" opacity="0.9"/>
      <line x1="12" y1="25" x2="48" y2="25" stroke="#22c55e" stroke-width="1" opacity="0.7"/>
    </svg>`
  if (['bluetooth', 'ble', 'wifi', 'esp_wifi', 'lora', 'gps', 'gsm'].includes(t)) return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="8" width="46" height="40" rx="4" fill="#1a1a2e" stroke="#3b82f6" stroke-width="1.5"/>
      <circle cx="35" cy="40" r="3.5" fill="#3b82f6"/>
      <path d="M27 33 Q35 26 43 33" fill="none" stroke="#3b82f6" stroke-width="2"/>
      <path d="M21 27 Q35 17 49 27" fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.7"/>
    </svg>`
  // Default
  return `
    <svg viewBox="0 0 70 55" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="7" width="54" height="41" rx="3" fill="#0d1117" stroke="#6366f1" stroke-width="1.5"/>
      <rect x="14" y="14" width="14" height="11" rx="1" fill="#1a1a2e" stroke="#4f46e5" stroke-width="1"/>
      <rect x="14" y="30" width="14" height="11" rx="1" fill="#1a1a2e" stroke="#4f46e5" stroke-width="1"/>
      <rect x="42" y="14" width="14" height="11" rx="1" fill="#1a1a2e" stroke="#4f46e5" stroke-width="1"/>
      <rect x="42" y="30" width="14" height="11" rx="1" fill="#1a1a2e" stroke="#4f46e5" stroke-width="1"/>
    </svg>`
}

// ── Component card (schematic view) ───────────────────────────────────────────
function ComponentCard({
  comp, selected, onClick, onCardMouseDown, isDraggingThis,
}: {
  comp: any
  selected: boolean
  onClick: () => void
  onCardMouseDown: (e: React.MouseEvent) => void
  isDraggingThis: boolean
}) {
  const cat = comp.category || 'MODULE'
  const colors = CAT[cat] || DEFAULT_CAT
  return (
    <div
      className="circuit-card"
      onClick={onClick}
      onMouseDown={onCardMouseDown}
      style={{
        position: 'absolute',
        left: comp.x, top: comp.y, width: CARD_W,
        background: colors.bg,
        border: `1.5px solid ${selected || isDraggingThis ? colors.border : colors.border + 'bb'}`,
        borderRadius: 10,
        cursor: isDraggingThis ? 'grabbing' : 'grab',
        userSelect: 'none',
        boxShadow: isDraggingThis
          ? `0 8px 24px ${colors.border}44, 0 4px 12px rgba(0,0,0,0.18)`
          : selected ? `0 0 16px ${colors.border}44, 0 2px 10px rgba(0,0,0,0.12)` : '0 2px 8px rgba(0,0,0,0.12)',
        transition: isDraggingThis ? 'none' : 'border-color 0.15s, box-shadow 0.15s',
        overflow: 'hidden',
        zIndex: isDraggingThis ? 100 : 1,
      }}
    >
      <div style={{ background: colors.badge, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${colors.border}44` }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.border, flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: colors.text, letterSpacing: '0.1em', fontFamily: 'Kanit, sans-serif', flex: 1 }}>{cat}</span>
        {comp.quantity > 1 && <span style={{ fontSize: 9, color: colors.text, opacity: 0.75, fontFamily: 'Kanit, sans-serif', fontWeight: 600 }}>×{comp.quantity}</span>}
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#111', lineHeight: 1.25, marginBottom: 2, fontFamily: 'Kanit, sans-serif' }}>{comp.name}</p>
        <p style={{ fontSize: 10, color: '#555', lineHeight: 1.3, marginBottom: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{comp.model}</p>
        <div
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 7, padding: '5px 0', marginBottom: 8 }}
          dangerouslySetInnerHTML={{ __html: getIconSVG(comp.type).replace('<svg ', '<svg width="68" height="52" ') }}
        />
        {comp.pins?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {comp.pins.slice(0, 7).map((pin: string, i: number) => (
              <span key={i} style={{ fontSize: 8, color: colors.text, background: colors.badge, padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>{pin}</span>
            ))}
            {comp.pins.length > 7 && <span style={{ fontSize: 8, color: '#444' }}>+{comp.pins.length - 7}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Board view helpers ────────────────────────────────────────────────────────
function getBoardSize(type?: string): { w: number; h: number } {
  const t = (type || '').toLowerCase()
  if (['arduino', 'mcu', 'microcontroller', 'stm32', 'attiny'].includes(t)) return { w: 165, h: 68 }
  if (['esp32', 'esp8266'].includes(t)) return { w: 160, h: 55 }
  if (['raspberry_pi'].includes(t)) return { w: 200, h: 130 }
  if (['battery', 'lipo'].includes(t)) return { w: 135, h: 65 }
  if (['motor_servo'].includes(t)) return { w: 130, h: 72 }
  if (['motor_stepper'].includes(t)) return { w: 88, h: 88 }
  if (t === 'esc') return { w: 150, h: 58 }
  if (t.startsWith('motor') || t === 'motor_dc') return { w: 88, h: 88 }
  if (t.includes('sensor') || t === 'sensor') return { w: 102, h: 54 }
  if (['display', 'lcd', 'oled', 'tft'].includes(t)) return { w: 132, h: 84 }
  return { w: 120, h: 60 }
}

function getBoardSVG(comp: any): string {
  const t = (comp.type || comp.category || '').toLowerCase()
  const { w, h } = getBoardSize(comp.type || comp.category)
  const name = (comp.name || '').slice(0, 18)
  if (['arduino', 'mcu', 'microcontroller', 'stm32', 'attiny'].includes(t) || t === 'mcu') return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="4" fill="#1a4a6e" stroke="#1e6091" stroke-width="1.5"/>
      <rect x="${w/2-9}" y="0" width="18" height="9" rx="2" fill="#555"/>
      <rect x="${w/2-18}" y="${h/2-14}" width="36" height="28" rx="2" fill="#111" stroke="#444" stroke-width="1"/>
      <text x="${w/2}" y="${h/2+4}" text-anchor="middle" fill="#888" font-size="5" font-family="monospace">MEGA328P</text>
      <text x="${w/2}" y="${h-4}" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="5.5" font-weight="700">ARDUINO NANO</text>
    </svg>`
  if (['esp32', 'esp8266'].includes(t)) return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="4" fill="#1a3a1a" stroke="#2d6a2d" stroke-width="1.5"/>
      <rect x="16" y="10" width="${w-54}" height="${h-20}" rx="3" fill="#1e3a1e" stroke="#3a7a3a" stroke-width="1"/>
      <text x="${w/2-16}" y="${h/2+4}" text-anchor="middle" fill="#4ade80" font-size="7" font-weight="bold" font-family="monospace">ESP32</text>
    </svg>`
  if (t.startsWith('motor') && t !== 'motor_servo' && t !== 'motor_stepper' && t !== 'esc') {
    const cx = w/2, cy = h/2, r = Math.min(w, h)/2 - 4
    return `
      <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#2a2a3e" stroke="#4444aa" stroke-width="2"/>
        <circle cx="${cx}" cy="${cy}" r="${r-8}" fill="#1a1a2e" stroke="#3333aa" stroke-width="1.5"/>
        <text x="${cx}" y="${cy+3}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="7" font-family="monospace">BLDC</text>
      </svg>`
  }
  if (t === 'motor_servo') return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="8" width="${w*0.65}" height="${h-8}" rx="4" fill="#1a2a4a" stroke="#2a4a8a" stroke-width="1.5"/>
      <text x="${w*0.3}" y="${h/2+4}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="7">SERVO</text>
    </svg>`
  if (t === 'esc') return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="5" fill="#1a1a4e" stroke="#2a2a9a" stroke-width="1.5"/>
      <text x="${w/2}" y="${h-5}" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="6" font-family="monospace">ESC 30A</text>
    </svg>`
  if (t === 'battery' || t === 'lipo' || comp.category === 'POWER') return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="5" fill="#111a11" stroke="#2d5a2d" stroke-width="1.5"/>
      <rect x="${w-14}" y="${h/2-11}" width="14" height="22" rx="2" fill="#f59e0b" stroke="#d97706" stroke-width="1"/>
      <text x="${w/2-8}" y="${h/2+4}" text-anchor="middle" fill="rgba(255,255,255,0.45)" font-size="9" font-weight="700">3S LiPo</text>
    </svg>`
  if (t.includes('sensor') || comp.category === 'SENSOR') return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="4" fill="#0d2b2b" stroke="#14b8a6" stroke-width="1.5"/>
      <circle cx="${(w-40)/2+8}" cy="${h/2}" r="${Math.min(h-16,w-40)/2-6}" fill="#002a2a" stroke="#14b8a6" stroke-width="1"/>
      <text x="8" y="${h-4}" fill="rgba(255,255,255,0.3)" font-size="5.5" font-family="monospace">${name.slice(0,12)}</text>
    </svg>`
  if (t === 'display' || t === 'oled' || t === 'lcd' || t === 'tft' || comp.category === 'DISPLAY') return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="4" fill="#0a1a0a" stroke="#22c55e" stroke-width="1.5"/>
      <rect x="9" y="9" width="${w-18}" height="${h-28}" rx="2" fill="#001200"/>
      <text x="${w/2}" y="${h-12}" text-anchor="middle" fill="rgba(255,255,255,0.25)" font-size="5.5" font-family="monospace">SDA SCL VCC GND</text>
    </svg>`
  // Generic
  const catColor: Record<string, string> = { MCU: '#3b82f6', SENSOR: '#14b8a6', ACTUATOR: '#eab308', POWER: '#f97316', MODULE: '#a855f7', DISPLAY: '#22c55e' }
  const cc = catColor[comp.category] || '#6366f1'
  return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="4" fill="#0d1117" stroke="${cc}" stroke-width="1.5"/>
      <rect x="${w/2-16}" y="${h/2-12}" width="32" height="24" rx="2" fill="#111" stroke="#444" stroke-width="1"/>
      <text x="${w/2}" y="${h/2+5}" text-anchor="middle" fill="${cc}" font-size="6.5" font-weight="700" opacity="0.7">${name.slice(0,10)}</text>
    </svg>`
}

function getBoardPinPos(comp: any, pinName: string, isSource: boolean): { x: number; y: number } {
  const { w, h } = getBoardSize(comp.type || comp.category)
  const pin = (pinName || '').toLowerCase()
  if (/\bgnd\b|ground|negative/.test(pin)) return { x: comp.x, y: comp.y + h - 12 }
  if (/vcc|5v|vin|power/.test(pin)) return { x: comp.x, y: comp.y + 12 }
  return isSource
    ? { x: comp.x + w, y: comp.y + h / 2 }
    : { x: comp.x, y: comp.y + h / 2 }
}

function BoardComponent({ comp, isDraggingThis, onClick, onCardMouseDown }: any) {
  const { w, h } = getBoardSize(comp.type || comp.category)
  return (
    <div
      className="circuit-card"
      onClick={onClick}
      onMouseDown={onCardMouseDown}
      style={{
        position: 'absolute',
        left: comp.x, top: comp.y, width: w,
        cursor: isDraggingThis ? 'grabbing' : 'grab',
        userSelect: 'none',
        filter: isDraggingThis ? 'drop-shadow(0 8px 20px rgba(0,0,0,0.8))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
        transition: isDraggingThis ? 'none' : 'filter 0.15s',
        zIndex: isDraggingThis ? 100 : 1,
      }}
      dangerouslySetInnerHTML={{ __html: getBoardSVG(comp).replace('<svg ', `<svg width="${w}" height="${h}" `) }}
    />
  )
}

// ── Wire styling ──────────────────────────────────────────────────────────────
function getWireStyle(conn: any): { color: string; glow: string; width: number } {
  const text = [conn.label || '', conn.fromPin || '', conn.toPin || '', conn.type || ''].join(' ').toLowerCase()
  if (/\bgnd\b|ground|negative/.test(text)) return { color: '#374151', glow: '#6b7280', width: 2.5 }
  if (/\b(vcc|vin|vbat|5v|3\.3v|bat\+|vbus|positive|power)\b/.test(text) || conn.type === 'power')
    return { color: '#dc2626', glow: '#ef4444', width: 3 }
  if (/\b(sda|scl|i2c)\b/.test(text)) return { color: '#2563eb', glow: '#3b82f6', width: 1.8 }
  if (/\b(tx|rx|uart|serial)\b/.test(text)) return { color: '#16a34a', glow: '#22c55e', width: 1.8 }
  if (/\b(pwm|m[1-4]|signal|esc|throttle|servo)\b/.test(text)) return { color: '#ca8a04', glow: '#fbbf24', width: 2 }
  if (/\b(mosi|miso|sck|cs|spi)\b/.test(text)) return { color: '#7c3aed', glow: '#a855f7', width: 1.8 }
  return { color: '#0891b2', glow: '#22d3ee', width: 1.8 }
}

function buildOrthogonalPath(x1: number, y1: number, x2: number, y2: number, index: number): string {
  const stagger = (index % 5) * 8 - 16
  const dx = x2 - x1, dy = y2 - y1
  if (Math.abs(dx) > Math.abs(dy)) {
    const midX = x1 + dx / 2 + stagger
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`
  }
  const midY = y1 + dy / 2 + stagger
  return `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`
}

function ConnectionLine({ conn, compMap, index }: { conn: any; compMap: any; index: number }) {
  const from = compMap[conn.from], to = compMap[conn.to]
  if (!from || !to) return null
  const dx = to.x - from.x
  let x1: number, y1: number, x2: number, y2: number
  if (dx >= 0) { x1 = from.x + CARD_W; y1 = from.y + CARD_H/2; x2 = to.x; y2 = to.y + CARD_H/2 }
  else { x1 = from.x; y1 = from.y + CARD_H/2; x2 = to.x + CARD_W; y2 = to.y + CARD_H/2 }
  const ws = getWireStyle(conn)
  const path = buildOrthogonalPath(x1, y1, x2, y2, index)
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2
  const label = conn.label || conn.fromPin || ''
  return (
    <g>
      <path d={path} fill="none" stroke={ws.glow} strokeWidth={ws.width + 4} opacity="0.18" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke={ws.color} strokeWidth={ws.width} opacity="0.88" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x2} cy={y2} r="3.5" fill={ws.color} opacity="0.9" />
      <circle cx={x2} cy={y2} r="1.5" fill="#f8fafc" opacity="0.7" />
      <circle cx={x1} cy={y1} r="2.5" fill={ws.color} opacity="0.7" />
      {label && (
        <g transform={`translate(${midX},${midY})`}>
          <rect x={-label.length * 3 - 3} y="-8" width={label.length * 6 + 6} height="13" rx="3" fill="#ffffff" stroke={ws.color} strokeWidth="0.7" opacity="0.85" />
          <text x="0" y="3" fill={ws.color} fontSize="8" textAnchor="middle" fontFamily="monospace" fontWeight="600" style={{ userSelect: 'none', pointerEvents: 'none' }}>{label}</text>
        </g>
      )}
    </g>
  )
}

function BoardConnectionLine({ conn, compMap, index }: { conn: any; compMap: any; index: number }) {
  const from = compMap[conn.from], to = compMap[conn.to]
  if (!from || !to) return null
  const p1 = getBoardPinPos(from, conn.fromPin || conn.label || '', true)
  const p2 = getBoardPinPos(to, conn.toPin || conn.label || '', false)
  const ws = getWireStyle(conn)
  const stagger = (index % 7) * 6 - 18
  const dx = p2.x - p1.x, dy = p2.y - p1.y
  let path: string
  if (Math.abs(dx) > Math.abs(dy)) {
    const midX = p1.x + dx / 2 + stagger
    path = `M ${p1.x} ${p1.y} H ${midX} V ${p2.y} H ${p2.x}`
  } else {
    const midY = p1.y + dy / 2 + stagger
    path = `M ${p1.x} ${p1.y} V ${midY} H ${p2.x} V ${p2.y}`
  }
  const label = conn.label || conn.fromPin || ''
  const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2
  return (
    <g>
      <path d={path} fill="none" stroke={ws.glow} strokeWidth={ws.width + 5} opacity="0.15" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={ws.width + 2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke={ws.color} strokeWidth={ws.width} opacity="0.95" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={p1.x} cy={p1.y} r="4" fill={ws.color} opacity="0.85" />
      <circle cx={p2.x} cy={p2.y} r="4" fill={ws.color} opacity="0.85" />
      {label && (
        <g transform={`translate(${midX},${midY})`}>
          <rect x={-label.length * 3.2 - 3} y="-8" width={label.length * 6.4 + 6} height="13" rx="3" fill="rgba(255,255,255,0.95)" stroke={ws.color} strokeWidth="0.7" />
          <text x="0" y="3" fill={ws.color} fontSize="8" textAnchor="middle" fontFamily="monospace" fontWeight="700">{label}</text>
        </g>
      )}
    </g>
  )
}

// ── MiniMap ───────────────────────────────────────────────────────────────────
const MM_W = 200, MM_H = 130

function MiniMap({ comps, conns, zoom, pan, containerRef, onNavigate }: any) {
  if (!comps.length) return null
  const minX = Math.min(...comps.map((c: any) => c.x))
  const minY = Math.min(...comps.map((c: any) => c.y))
  const maxX = Math.max(...comps.map((c: any) => c.x + CARD_W))
  const maxY = Math.max(...comps.map((c: any) => c.y + CARD_H))
  const cW = maxX - minX + 60, cH = maxY - minY + 60
  const scale = Math.min(MM_W / cW, MM_H / cH) * 0.9
  const offX = (MM_W - cW * scale) / 2 - minX * scale
  const offY = (MM_H - cH * scale) / 2 - minY * scale
  const toMM = (x: number, y: number): [number, number] => [x * scale + offX, y * scale + offY]
  const container = containerRef.current
  const vW = container ? container.clientWidth / zoom : 600
  const vH = container ? container.clientHeight / zoom : 400
  const vX = -pan.x / zoom, vY = -pan.y / zoom
  const [vx1, vy1] = toMM(vX, vY)
  const vw = vW * scale, vh = vH * scale

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const cx = (mx - offX) / scale, cy = (my - offY) / scale
    onNavigate(cx, cy)
  }

  return (
    <div onClick={handleClick} style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', cursor: 'crosshair' }}>
      <div style={{ padding: '4px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6' }} />
        <span style={{ fontSize: 8, color: '#555', fontFamily: 'Kanit, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Blueprint</span>
        <span style={{ fontSize: 8, color: '#333', marginLeft: 'auto', fontFamily: 'monospace' }}>{comps.length} parts</span>
      </div>
      <svg width={MM_W} height={MM_H} style={{ display: 'block' }}>
        {conns.map((conn: any, i: number) => {
          const from = comps.find((c: any) => c.id === conn.from)
          const to = comps.find((c: any) => c.id === conn.to)
          if (!from || !to) return null
          const [fx, fy] = toMM(from.x + CARD_W / 2, from.y + CARD_H / 2)
          const [tx, ty] = toMM(to.x + CARD_W / 2, to.y + CARD_H / 2)
          const ws = getWireStyle(conn)
          return <line key={i} x1={fx} y1={fy} x2={tx} y2={ty} stroke={ws.color} strokeWidth="0.9" opacity="0.6" />
        })}
        {comps.map((comp: any) => {
          const cat = comp.category || 'MODULE'
          const colors = CAT[cat] || DEFAULT_CAT
          const [cx, cy] = toMM(comp.x, comp.y)
          const cw = CARD_W * scale, ch = CARD_H * scale
          return (
            <g key={comp.id}>
              <rect x={cx} y={cy} width={cw} height={ch} rx="2" fill={colors.bg} stroke={colors.border} strokeWidth="0.8" opacity="0.9" />
              <rect x={cx} y={cy} width={cw} height={Math.max(3, ch * 0.12)} rx="1" fill={colors.badge} />
              <circle cx={cx + cw / 2} cy={cy + ch / 2} r={Math.max(1.5, cw * 0.07)} fill={colors.border} opacity="0.6" />
            </g>
          )
        })}
        <rect x={Math.max(0, vx1)} y={Math.max(0, vy1)} width={Math.min(MM_W - Math.max(0, vx1), vw)} height={Math.min(MM_H - Math.max(0, vy1), vh)} fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.4)" strokeWidth="1" rx="1" />
      </svg>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
  borderRadius: 7, color: '#555', display: 'flex', alignItems: 'center', transition: 'color 0.15s',
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CircuitCanvas() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [circuit, setCircuit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(0.75)
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedComp, setSelectedComp] = useState<any>(null)
  const [draggingCard, setDraggingCard] = useState<any>(null)
  const [localComps, setLocalComps] = useState<any[]>([])
  const [sharing, setSharing] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [viewMode, setViewMode] = useState<'schematic' | 'board'>('schematic')
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false)
  const [showPanel, setShowPanel] = useState(typeof window !== 'undefined' ? window.innerWidth >= 640 : true)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef({ x: 40, y: 40 })
  const zoomRef = useRef(0.75)
  useEffect(() => { panRef.current = pan }, [pan])
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pointerPanStart = useRef<{ x: number; y: number } | null>(null)
  const pointerStartPos = useRef({ x: 0, y: 0 })
  const lastPinchDist = useRef<number | null>(null)

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 640
      setIsMobile(mobile)
      if (!mobile) setShowPanel(true)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (!id) return
    electronicsGet(id)
      .then(({ data }: any) => {
        const sourceShape = toSourceShape(data)
        setCircuit(sourceShape)
        setIsPublic(!!sourceShape?.is_public)
        setLocalComps(autoLayout(sourceShape?.circuit_data?.components || []))
      })
      .catch(() => setError('Circuit not found.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      setZoom((z) => {
        const nz = Math.max(0.15, Math.min(3, z * factor))
        setPan((p) => ({ x: mx - (mx - p.x) * (nz / z), y: my - (my - p.y) * (nz / z) }))
        return nz
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [circuit])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const size = pointersRef.current.size
    if (size === 1) {
      pointerPanStart.current = { ...panRef.current }
      pointerStartPos.current = { x: e.clientX, y: e.clientY }
      lastPinchDist.current = null
    } else if (size === 2) {
      pointerPanStart.current = null
      const pts = [...pointersRef.current.values()]
      const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy)
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const size = pointersRef.current.size
    if (size === 2) {
      const pts = [...pointersRef.current.values()]
      const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (lastPinchDist.current && dist > 0) {
        const factor = dist / lastPinchDist.current
        const rect = e.currentTarget.getBoundingClientRect()
        const mx = (pts[0].x + pts[1].x) / 2 - rect.left
        const my = (pts[0].y + pts[1].y) / 2 - rect.top
        const curZ = zoomRef.current
        const nz = Math.max(0.15, Math.min(3, curZ * factor))
        const curP = panRef.current
        const newP = { x: mx - (mx - curP.x) * (nz / curZ), y: my - (my - curP.y) * (nz / curZ) }
        setPan(newP); setZoom(nz)
        panRef.current = newP; zoomRef.current = nz
      }
      lastPinchDist.current = dist
    } else if (size === 1 && pointerPanStart.current) {
      const dx = e.clientX - pointerStartPos.current.x
      const dy = e.clientY - pointerStartPos.current.y
      const newP = { x: pointerPanStart.current.x + dx, y: pointerPanStart.current.y + dy }
      setPan(newP); panRef.current = newP
    }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    pointersRef.current.delete(e.pointerId)
    const size = pointersRef.current.size
    if (size === 0) {
      pointerPanStart.current = null
      lastPinchDist.current = null
    } else if (size === 1) {
      const [rem] = pointersRef.current.values()
      pointerPanStart.current = { ...panRef.current }
      pointerStartPos.current = { x: rem.x, y: rem.y }
      lastPinchDist.current = null
    }
  }, [])

  const handleMiniMapNavigate = useCallback((cx: number, cy: number) => {
    const c = containerRef.current
    if (!c) return
    setPan({ x: c.clientWidth / 2 - cx * zoom, y: c.clientHeight / 2 - cy * zoom })
  }, [zoom])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.circuit-card')) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan])

  const handleCardMouseDown = useCallback((comp: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setDraggingCard({ id: comp.id, startMX: e.clientX, startMY: e.clientY, origX: comp.x, origY: comp.y })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingCard) {
      const dx = (e.clientX - draggingCard.startMX) / zoom
      const dy = (e.clientY - draggingCard.startMY) / zoom
      setLocalComps((prev) => prev.map((c) =>
        c.id === draggingCard.id
          ? { ...c, x: Math.max(0, Math.round(draggingCard.origX + dx)), y: Math.max(0, Math.round(draggingCard.origY + dy)) }
          : c,
      ))
    } else if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }, [draggingCard, isDragging, dragStart, zoom])

  const handleMouseUp = useCallback(() => { setIsDragging(false); setDraggingCard(null) }, [])

  const handleRegenerate = async () => {
    if (!id) return
    setRegenerating(true)
    try {
      await electronicsRegenerate(id)
      const { data }: any = await electronicsGet(id)
      const sourceShape = toSourceShape(data)
      setCircuit(sourceShape)
      setLocalComps(sourceShape?.circuit_data?.components || [])
      setSelectedComp(null)
    } catch { /* silent */ } finally { setRegenerating(false) }
  }

  const handleShare = async () => {
    if (!id) return
    setSharing(true)
    try {
      const next = !isPublic
      const { data }: any = await electronicsShare(id, next)
      setIsPublic(typeof data?.isPublic === 'boolean' ? data.isPublic : next)
    } catch { /* silent */ } finally { setSharing(false) }
  }

  const handleDownloadSVG = () => {
    if (!circuit) return
    const cd = circuit.circuit_data || {}
    const comps = cd.components || []
    const conns = cd.connections || []
    const maxX = Math.max(...comps.map((c: any) => c.x + CARD_W + 60), 800)
    const maxY = Math.max(...comps.map((c: any) => c.y + CARD_H + 60), 600)
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" style="background:#ffffff">`
    for (let ci = 0; ci < conns.length; ci++) {
      const conn = conns[ci]
      const from = comps.find((c: any) => c.id === conn.from)
      const to = comps.find((c: any) => c.id === conn.to)
      if (!from || !to) continue
      const dx = to.x - from.x
      let x1: number, y1: number, x2: number, y2: number
      if (dx >= 0) { x1 = from.x + CARD_W; y1 = from.y + CARD_H/2; x2 = to.x; y2 = to.y + CARD_H/2 }
      else { x1 = from.x; y1 = from.y + CARD_H/2; x2 = to.x + CARD_W; y2 = to.y + CARD_H/2 }
      const ws = getWireStyle(conn)
      const path = buildOrthogonalPath(x1, y1, x2, y2, ci)
      svg += `<path d="${path}" fill="none" stroke="${ws.color}" stroke-width="${ws.width}" stroke-linecap="round"/>`
    }
    for (const comp of comps) {
      const cat = comp.category || 'MODULE'
      const colors = CAT[cat] || DEFAULT_CAT
      svg += `<rect x="${comp.x}" y="${comp.y}" width="${CARD_W}" height="${CARD_H}" rx="10" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1.5"/>`
      svg += `<text x="${comp.x+10}" y="${comp.y+38}" fill="#111827" font-size="11" font-weight="bold">${comp.name}</text>`
    }
    svg += '</svg>'
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${circuit.title || 'circuit'}.svg`; a.click()
    URL.revokeObjectURL(url)
  }

  const copyLink = () => {
    if (!id) return
    navigator.clipboard.writeText(`${window.location.origin}/circuit/${id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!id) return null
  if (loading) return (
    <div className="bg-background" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader-spinner loader-spinner-lg" />
    </div>
  )
  if (error || !circuit) return (
    <div className="bg-background" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: '#6b7280', fontSize: 14 }}>{error || 'Circuit not found.'}</p>
      <button onClick={() => navigate('/electronics')} style={{ padding: '10px 20px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#3b82f6', cursor: 'pointer', fontFamily: 'Kanit,sans-serif', fontWeight: 700 }}>
        Back to Electronics
      </button>
    </div>
  )

  const cd = circuit.circuit_data || {}
  const comps = localComps.length > 0 ? localComps : (cd.components || [])
  const conns = cd.connections || []
  const compMap: Record<string, any> = Object.fromEntries(comps.map((c: any) => [c.id, c]))

  return (
    <div style={{ height: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ height: 52, borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', background: 'rgba(255,255,255,0.98)', flexShrink: 0, zIndex: 10, minWidth: 0 }}>
        <button onClick={() => navigate('/electronics')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 7, color: '#555', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <ArrowLeft size={16} />
        </button>
        {isMobile && (
          <button onClick={() => setShowPanel((s) => !s)} style={{ ...iconBtn, color: showPanel ? '#3b82f6' : '#555', flexShrink: 0 }} title="Toggle parts panel">
            <LayoutGrid size={15} />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: isMobile ? 11 : 13, fontWeight: 800, color: '#111827', fontFamily: 'Kanit,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{circuit.title}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 2 : 6, overflowX: isMobile ? 'auto' : 'visible', flexShrink: 0, maxWidth: isMobile ? '55vw' : 'none' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', borderRadius: 7, padding: 2, gap: 2, flexShrink: 0 }}>
            {[
              { id: 'schematic' as const, label: 'SCH' },
              { id: 'board' as const, label: 'PCB' },
            ].map((v) => (
              <button key={v.id} onClick={() => setViewMode(v.id)} style={{
                padding: '3px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                fontFamily: 'monospace', fontWeight: 700, fontSize: 10,
                background: viewMode === v.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: viewMode === v.id ? '#3b82f6' : '#444',
              }}>{v.label}</button>
            ))}
          </div>
          <button onClick={() => {
            const z = zoomRef.current
            const nz = Math.min(3, z * 1.25)
            const el = containerRef.current
            if (el) { const cx = el.clientWidth / 2, cy = el.clientHeight / 2; setPan((p) => ({ x: cx - (cx - p.x) * (nz / z), y: cy - (cy - p.y) * (nz / z) })) }
            setZoom(nz)
          }} style={{ ...iconBtn }}><ZoomIn size={isMobile ? 18 : 15} /></button>
          {!isMobile && <span style={{ fontSize: 11, color: '#444', minWidth: 36, textAlign: 'center', fontFamily: 'monospace' }}>{Math.round(zoom * 100)}%</span>}
          <button onClick={() => {
            const z = zoomRef.current
            const nz = Math.max(0.15, z * 0.8)
            const el = containerRef.current
            if (el) { const cx = el.clientWidth / 2, cy = el.clientHeight / 2; setPan((p) => ({ x: cx - (cx - p.x) * (nz / z), y: cy - (cy - p.y) * (nz / z) })) }
            setZoom(nz)
          }} style={{ ...iconBtn }}><ZoomOut size={isMobile ? 18 : 15} /></button>
          <button onClick={() => { setZoom(0.75); setPan({ x: 40, y: 40 }) }} style={{ ...iconBtn }} title="Reset view"><Maximize2 size={15} /></button>
          {!isMobile && <button onClick={() => setLocalComps((prev) => autoLayout(prev))} style={{ ...iconBtn }} title="Auto-layout"><LayoutGrid size={15} /></button>}
          <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.08)', margin: '0 2px', flexShrink: 0 }} />
          <button onClick={handleRegenerate} disabled={regenerating} style={{ ...iconBtn, color: regenerating ? '#333' : '#555' }} title="Regenerate">
            <RefreshCw size={15} style={{ animation: regenerating ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          {!isMobile && <button onClick={handleDownloadSVG} style={{ ...iconBtn }} title="Download SVG"><Download size={15} /></button>}
          <button onClick={() => setShareOpen((s) => !s)} style={{ ...iconBtn, color: isPublic ? '#22c55e' : '#555' }} title="Share"><Share2 size={15} /></button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel */}
        {isMobile && showPanel && (
          <div onClick={() => setShowPanel(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 20 }} />
        )}
        <div style={{
          width: 250, borderRight: '1px solid rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
          background: '#fff',
          ...(isMobile ? {
            position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 25,
            transform: showPanel ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.22s ease',
            boxShadow: showPanel ? '4px 0 24px rgba(0,0,0,0.25)' : 'none',
          } : {}),
        }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <p style={{ fontSize: 9, color: '#444', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Kanit,sans-serif', marginBottom: 10 }}>{viewMode === 'board' ? 'BOARD VIEW' : 'SCHEMATIC'}</p>
            <p style={{ fontSize: 9, color: '#333', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>NODE TYPES</p>
            {Object.entries(CAT).map(([cat, c]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.border, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#666', fontFamily: 'Kanit,sans-serif', fontWeight: 600 }}>{cat}</span>
              </div>
            ))}
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 9, color: '#333', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>WIRE COLORS</p>
              {[
                { color: '#dc2626', label: 'VCC / Power' },
                { color: '#374151', label: 'GND' },
                { color: '#2563eb', label: 'I2C (SDA/SCL)' },
                { color: '#16a34a', label: 'UART (TX/RX)' },
                { color: '#ca8a04', label: 'PWM / Signal' },
                { color: '#7c3aed', label: 'SPI' },
                { color: '#0891b2', label: 'Data / Other' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" /></svg>
                  <span style={{ fontSize: 10, color: '#666', fontFamily: 'Kanit,sans-serif' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 16px' }}>
            <p style={{ fontSize: 9, color: '#333', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'Kanit,sans-serif' }}>
              PARTS LIST ({comps.length} components)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {comps.map((c: any, i: number) => {
                const cat = c.category || 'MODULE'
                const colors = CAT[cat] || DEFAULT_CAT
                const isSel = selectedComp?.id === c.id
                const linkedConns = conns.filter((cn: any) => cn.from === c.id || cn.to === c.id)
                const linkedParts = linkedConns.map((cn: any) => {
                  const isFrom = cn.from === c.id
                  const otherId = isFrom ? cn.to : cn.from
                  const other = compMap[otherId]
                  if (!other) return null
                  const myPin = isFrom ? (cn.fromPin || '') : (cn.toPin || '')
                  const otherPin = isFrom ? (cn.toPin || '') : (cn.fromPin || '')
                  const label = cn.label || myPin || otherPin || ''
                  return { name: other.name, myPin, otherPin, label, cat: other.category || 'MODULE' }
                }).filter(Boolean)

                return (
                  <div key={c.id} onClick={() => setSelectedComp(isSel ? null : c)} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 8px',
                    borderRadius: 7, cursor: 'pointer', transition: 'background 0.1s',
                    background: isSel ? colors.bg : 'transparent',
                    border: isSel ? `1px solid ${colors.border}44` : '1px solid transparent',
                  }}>
                    <span style={{ fontSize: 9, color: '#333', minWidth: 16, paddingTop: 1, fontFamily: 'monospace' }}>{String(i + 1).padStart(2, '0')}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: colors.border, flexShrink: 0 }} />
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#111', fontFamily: 'Kanit,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                        {c.quantity > 1 && <span style={{ fontSize: 9, color: colors.text, background: colors.badge, padding: '0 4px', borderRadius: 3, flexShrink: 0 }}>×{c.quantity}</span>}
                      </div>
                      <p style={{ fontSize: 9, color: '#555', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{c.model}</p>
                      {linkedParts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {linkedParts.map((lp: any, li: number) => {
                            const lc = CAT[lp.cat] || DEFAULT_CAT
                            const pinText = lp.label ? lp.label : [lp.myPin, lp.otherPin].filter(Boolean).join('→')
                            return (
                              <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <svg width="10" height="6" style={{ flexShrink: 0 }}><line x1="0" y1="3" x2="10" y2="3" stroke={lc.border} strokeWidth="1.5" strokeDasharray="2,1.5" /></svg>
                                <span style={{ fontSize: 9, color: '#444', fontFamily: 'Kanit,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                  {lp.name}
                                  {pinText && <span style={{ color: '#888', marginLeft: 3 }}>({pinText})</span>}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {isSel && c.specs && <p style={{ fontSize: 9, color: '#666', marginTop: 4, lineHeight: 1.4 }}>{c.specs}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            background: '#f8f9fa',
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px),
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {comps.length === 0 ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 13 }}>
              No components in this circuit.
            </div>
          ) : (
            <div style={{
              position: 'absolute',
              transformOrigin: '0 0',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              touchAction: 'none',
            }}>
              <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }} width="1" height="1">
                {conns.map((conn: any, i: number) =>
                  viewMode === 'board'
                    ? <BoardConnectionLine key={i} conn={conn} compMap={compMap} index={i} />
                    : <ConnectionLine key={i} conn={conn} compMap={compMap} index={i} />
                )}
              </svg>
              {comps.map((comp: any) => {
                const bSize = getBoardSize(comp.type || comp.category)
                const labelW = viewMode === 'board' ? bSize.w : CARD_W
                return (
                  <div key={comp.id} style={{ position: 'absolute', left: comp.x, top: comp.y }}>
                    {viewMode === 'board' ? (
                      <BoardComponent
                        comp={{ ...comp, x: 0, y: 0 }}
                        isDraggingThis={draggingCard?.id === comp.id}
                        onClick={() => { if (!draggingCard) setSelectedComp(selectedComp?.id === comp.id ? null : comp) }}
                        onCardMouseDown={(e: React.MouseEvent) => handleCardMouseDown(comp, e)}
                      />
                    ) : (
                      <ComponentCard
                        comp={{ ...comp, x: 0, y: 0 }}
                        selected={selectedComp?.id === comp.id}
                        isDraggingThis={draggingCard?.id === comp.id}
                        onClick={() => { if (!draggingCard) setSelectedComp(selectedComp?.id === comp.id ? null : comp) }}
                        onCardMouseDown={(e) => handleCardMouseDown(comp, e)}
                      />
                    )}
                    <div style={{ position: 'absolute', top: (viewMode === 'board' ? bSize.h : CARD_H) + 8, left: 0, width: labelW, textAlign: 'center', pointerEvents: 'none' }}>
                      <span style={{
                        display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#111',
                        fontFamily: 'Kanit,sans-serif', background: 'rgba(255,255,255,0.9)',
                        border: '1px solid rgba(0,0,0,0.08)', padding: '1px 6px', borderRadius: 4,
                        whiteSpace: 'nowrap', lineHeight: 1.5,
                      }}>{comp.name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {comps.length > 0 && (
            <MiniMap comps={comps} conns={conns} zoom={zoom} pan={pan} containerRef={containerRef} onNavigate={handleMiniMapNavigate} />
          )}

          <div style={{ position: 'absolute', bottom: 16, right: 16, fontSize: 10, color: '#888', fontFamily: 'Kanit,sans-serif', pointerEvents: 'none' }}>
            Scroll to zoom · Drag canvas to pan · Drag cards to move
          </div>
        </div>
      </div>

      {/* Share overlay */}
      {shareOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShareOpen(false)}>
          <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 16, padding: 24, width: 320, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', fontFamily: 'Kanit,sans-serif' }}>Share Circuit</p>
              <button onClick={() => setShareOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer', background: isPublic ? 'rgba(34,197,94,0.3)' : 'rgba(0,0,0,0.06)', border: `1px solid ${isPublic ? '#22c55e' : 'rgba(0,0,0,0.12)'}`, transition: 'all 0.2s' }} onClick={handleShare}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', position: 'absolute', top: 2, left: isPublic ? 18 : 2, background: isPublic ? '#22c55e' : '#9ca3af', transition: 'left 0.2s' }} />
              </div>
              <p style={{ fontSize: 12, color: isPublic ? '#22c55e' : '#6b7280' }}>
                {sharing ? '...' : isPublic ? 'Public — anyone with link can view' : 'Private — only you can see this'}
              </p>
            </div>
            {isPublic && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#6b7280', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {window.location.origin}/circuit/{id}
                </div>
                <button onClick={copyLink} style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.03)', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(0,0,0,0.1)'}`, color: copied ? '#22c55e' : '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span style={{ fontSize: 11 }}>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
