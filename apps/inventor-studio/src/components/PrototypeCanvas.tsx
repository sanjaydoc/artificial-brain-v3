import { useMemo, useState, type ReactElement } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  BaseEdge,
  getBezierPath,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// ── Node type → color ─────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  MCU: '#3b82f6',
  SENSOR: '#06b6d4',
  ACTUATOR: '#f97316',
  POWER: '#eab308',
  MODULE: '#8b5cf6',
  DISPLAY: '#22c55e',
  CONNECTOR: '#64748b',
  ECU: '#3b82f6',
  MOTOR: '#f97316',
  TRANSMISSION: '#94a3b8',
  CHASSIS: '#64748b',
  AVIONICS: '#3b82f6',
  PROPULSION: '#f97316',
  STRUCTURE: '#94a3b8',
  HULL: '#0ea5e9',
  NAVIGATION: '#06b6d4',
  ENGINE: '#f97316',
  CONTROL: '#8b5cf6',
  COMPOUND: '#ec4899',
  EXCIPIENT: '#f472b6',
  REAGENT: '#db2777',
  BIOREACTOR: '#14b8a6',
  EQUIPMENT: '#6b7280',
  PROCESS: '#14b8a6',
  CONTAINER: '#64748b',
  ANALYSIS: '#06b6d4',
  INCUBATOR: '#0891b2',
  VECTOR: '#a855f7',
  CELL: '#ec4899',
  ASSAY: '#06b6d4',
  FORMULATION: '#64748b',
  SERVICE: '#6366f1',
  DATABASE: '#8b5cf6',
  API: '#06b6d4',
  UI: '#22c55e',
  QUEUE: '#f59e0b',
  CACHE: '#94a3b8',
  AUTH: '#ef4444',
  STATION: '#6b7280',
  MACHINE: '#475569',
  CONVEYOR: '#94a3b8',
  QUALITY: '#22c55e',
  STORAGE: '#64748b',
  INPUT: '#0ea5e9',
  OUTPUT: '#10b981',
  DEPARTMENT: '#8b5cf6',
  FEEDBACK: '#f43f5e',
}

const DEFAULT_COLOR = '#6b7280'

// ── Column layout ─────────────────────────────────────────────────────────────
const TYPE_COL: Record<string, number> = {
  POWER: 0, INPUT: 0, COMPOUND: 0, HULL: 0, CELL: 0, VECTOR: 0,
  MCU: 1, ECU: 1, AVIONICS: 1, SERVICE: 1, BIOREACTOR: 1, PROCESS: 1, STATION: 1, DEPARTMENT: 1,
  MODULE: 2, DATABASE: 2, REAGENT: 2, EXCIPIENT: 2, MACHINE: 2, TRANSMISSION: 2, AUTH: 2, EQUIPMENT: 2,
  SENSOR: 3, API: 3, ANALYSIS: 3, QUALITY: 3, NAVIGATION: 3, ASSAY: 3,
  ACTUATOR: 4, DISPLAY: 4, UI: 4, OUTPUT: 4, CONTAINER: 4, MOTOR: 4, PROPULSION: 4,
  CONVEYOR: 4, FORMULATION: 4, STORAGE: 4, FEEDBACK: 4,
}

const COL_W = 260
const ROW_H = 210

function computeLayout(rawNodes: any[]) {
  const cols: Record<number, any[]> = {}
  rawNodes.forEach((n) => {
    const col = TYPE_COL[(n.data?.type || '').toUpperCase()] ?? 2
    if (!cols[col]) cols[col] = []
    cols[col].push(n)
  })
  const maxRows = Math.max(...Object.values(cols).map((c) => c.length))
  const totalH = maxRows * ROW_H
  return rawNodes.map((n) => {
    const col = TYPE_COL[(n.data?.type || '').toUpperCase()] ?? 2
    const colNodes = cols[col] || [n]
    const rowIdx = colNodes.indexOf(n)
    const colH = colNodes.length * ROW_H
    const yOffset = (totalH - colH) / 2
    return {
      ...n,
      position: { x: col * COL_W + 60, y: yOffset + rowIdx * ROW_H + 40 },
    }
  })
}

// ── Circuit symbol SVGs ───────────────────────────────────────────────────────
const CircuitSymbols: Record<string, ReactElement> = {
  resistor: (
    <svg width="70" height="24" viewBox="0 0 70 24" fill="none">
      <line x1="0" y1="12" x2="12" y2="12" stroke="#94a3b8" strokeWidth="1.5" />
      <polyline points="12,12 16,3 21,21 26,3 31,21 36,3 41,21 46,3 50,12" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <line x1="50" y1="12" x2="70" y2="12" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
  capacitor: (
    <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
      <line x1="0" y1="15" x2="25" y2="15" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="25" y1="3" x2="25" y2="27" stroke="#06b6d4" strokeWidth="3" />
      <line x1="32" y1="3" x2="32" y2="27" stroke="#06b6d4" strokeWidth="3" />
      <line x1="32" y1="15" x2="60" y2="15" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
  diode: (
    <svg width="60" height="26" viewBox="0 0 60 26" fill="none">
      <line x1="0" y1="13" x2="14" y2="13" stroke="#94a3b8" strokeWidth="1.5" />
      <polygon points="14,3 14,23 34,13" fill="#3b82f6" stroke="#3b82f6" strokeWidth="1" />
      <line x1="34" y1="3" x2="34" y2="23" stroke="#3b82f6" strokeWidth="2.5" />
      <line x1="34" y1="13" x2="60" y2="13" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
  led: (
    <svg width="70" height="32" viewBox="0 0 70 32" fill="none">
      <line x1="0" y1="16" x2="14" y2="16" stroke="#94a3b8" strokeWidth="1.5" />
      <polygon points="14,5 14,27 34,16" fill="#4ade80" stroke="#4ade80" strokeWidth="1" />
      <line x1="34" y1="5" x2="34" y2="27" stroke="#4ade80" strokeWidth="2.5" />
      <line x1="34" y1="16" x2="60" y2="16" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="40" y1="9" x2="50" y2="2" stroke="#4ade80" strokeWidth="1.2" />
      <line x1="44" y1="13" x2="56" y2="5" stroke="#4ade80" strokeWidth="1.2" />
      <polygon points="50,2 46,4 48,7" fill="#4ade80" />
      <polygon points="56,5 52,6 54,10" fill="#4ade80" />
    </svg>
  ),
  transistor: (
    <svg width="54" height="52" viewBox="0 0 54 52" fill="none">
      <circle cx="27" cy="26" r="22" stroke="#8b5cf6" strokeWidth="1.5" />
      <line x1="0" y1="26" x2="16" y2="26" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="16" y1="10" x2="16" y2="42" stroke="#8b5cf6" strokeWidth="2.5" />
      <line x1="16" y1="16" x2="34" y2="8" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="34" y1="8" x2="54" y2="8" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="16" y1="36" x2="34" y2="44" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="34" y1="44" x2="54" y2="44" stroke="#94a3b8" strokeWidth="1.5" />
      <polygon points="28,41 33,45 31,40" fill="#94a3b8" />
    </svg>
  ),
  mosfet: (
    <svg width="54" height="52" viewBox="0 0 54 52" fill="none">
      <circle cx="27" cy="26" r="22" stroke="#a78bfa" strokeWidth="1.5" />
      <line x1="0" y1="26" x2="14" y2="26" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="14" y1="12" x2="14" y2="40" stroke="#a78bfa" strokeWidth="1.5" />
      <line x1="17" y1="12" x2="17" y2="22" stroke="#a78bfa" strokeWidth="2.5" />
      <line x1="17" y1="30" x2="17" y2="40" stroke="#a78bfa" strokeWidth="2.5" />
      <line x1="17" y1="17" x2="32" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="32" y1="10" x2="54" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="17" y1="35" x2="32" y2="42" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="32" y1="42" x2="54" y2="42" stroke="#94a3b8" strokeWidth="1.5" />
      <polygon points="25,40 30,44 28,38" fill="#94a3b8" />
    </svg>
  ),
  inductor: (
    <svg width="80" height="22" viewBox="0 0 80 22" fill="none">
      <line x1="0" y1="11" x2="8" y2="11" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M8,11 Q13,0 18,11 Q23,22 28,11 Q33,0 38,11 Q43,22 48,11 Q53,0 58,11 Q63,22 68,11" stroke="#f59e0b" strokeWidth="2" fill="none" />
      <line x1="68" y1="11" x2="80" y2="11" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
  transformer: (
    <svg width="80" height="42" viewBox="0 0 80 42" fill="none">
      <line x1="0" y1="12" x2="6" y2="12" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M6,12 Q10,4 14,12 Q18,20 22,12 Q26,4 30,12" stroke="#f59e0b" strokeWidth="2" fill="none" />
      <line x1="30" y1="12" x2="36" y2="12" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="0" y1="30" x2="6" y2="30" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M6,30 Q10,38 14,30 Q18,22 22,30 Q26,38 30,30" stroke="#f59e0b" strokeWidth="2" fill="none" />
      <line x1="30" y1="30" x2="36" y2="30" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="37" y1="2" x2="37" y2="40" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="40" y1="2" x2="40" y2="40" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="40" y1="12" x2="46" y2="12" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M46,12 Q50,4 54,12 Q58,20 62,12 Q66,4 70,12" stroke="#06b6d4" strokeWidth="2" fill="none" />
      <line x1="70" y1="12" x2="80" y2="12" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="40" y1="30" x2="46" y2="30" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M46,30 Q50,38 54,30 Q58,22 62,30 Q66,38 70,30" stroke="#06b6d4" strokeWidth="2" fill="none" />
      <line x1="70" y1="30" x2="80" y2="30" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
  battery: (
    <svg width="64" height="26" viewBox="0 0 64 26" fill="none">
      <line x1="0" y1="13" x2="14" y2="13" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="14" y1="4" x2="14" y2="22" stroke="#eab308" strokeWidth="3" />
      <line x1="20" y1="8" x2="20" y2="18" stroke="#eab308" strokeWidth="1.5" />
      <line x1="26" y1="4" x2="26" y2="22" stroke="#eab308" strokeWidth="3" />
      <line x1="32" y1="8" x2="32" y2="18" stroke="#eab308" strokeWidth="1.5" />
      <line x1="38" y1="4" x2="38" y2="22" stroke="#eab308" strokeWidth="3" />
      <line x1="44" y1="8" x2="44" y2="18" stroke="#eab308" strokeWidth="1.5" />
      <line x1="44" y1="13" x2="64" y2="13" stroke="#94a3b8" strokeWidth="1.5" />
      <text x="12" y="3" fontSize="7" fill="#eab308" textAnchor="middle">+</text>
    </svg>
  ),
  motor: (
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
      <circle cx="23" cy="23" r="19" stroke="#f97316" strokeWidth="2" />
      <text x="23" y="29" fontSize="16" fill="#f97316" textAnchor="middle" fontWeight="bold" fontFamily="monospace">M</text>
      <line x1="0" y1="16" x2="4" y2="16" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="0" y1="30" x2="4" y2="30" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
  opamp: (
    <svg width="58" height="46" viewBox="0 0 58 46" fill="none">
      <polygon points="4,4 4,42 54,23" fill="none" stroke="#a855f7" strokeWidth="2" />
      <line x1="0" y1="14" x2="16" y2="14" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="0" y1="32" x2="16" y2="32" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="43" y1="23" x2="58" y2="23" stroke="#94a3b8" strokeWidth="1.5" />
      <text x="11" y="18" fontSize="9" fill="#a855f7" fontFamily="monospace">+</text>
      <text x="11" y="36" fontSize="9" fill="#a855f7" fontFamily="monospace">−</text>
    </svg>
  ),
  crystal: (
    <svg width="62" height="26" viewBox="0 0 62 26" fill="none">
      <line x1="0" y1="13" x2="18" y2="13" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="18" y1="3" x2="18" y2="23" stroke="#06b6d4" strokeWidth="1.5" />
      <rect x="20" y="5" width="10" height="16" stroke="#06b6d4" strokeWidth="1.5" fill="rgba(6,182,212,0.1)" />
      <line x1="30" y1="3" x2="30" y2="23" stroke="#06b6d4" strokeWidth="1.5" />
      <line x1="30" y1="13" x2="62" y2="13" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
  fuse: (
    <svg width="62" height="22" viewBox="0 0 62 22" fill="none">
      <line x1="0" y1="11" x2="12" y2="11" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="12" y="3" width="38" height="16" rx="8" stroke="#ef4444" strokeWidth="1.5" fill="rgba(239,68,68,0.08)" />
      <line x1="50" y1="11" x2="62" y2="11" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
  relay: (
    <svg width="70" height="42" viewBox="0 0 70 42" fill="none">
      <line x1="0" y1="32" x2="8" y2="32" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="8" y="24" width="24" height="16" stroke="#f59e0b" strokeWidth="1.5" fill="rgba(245,158,11,0.08)" />
      <line x1="32" y1="32" x2="40" y2="32" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="0" y1="10" x2="46" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="46" y1="10" x2="58" y2="2" stroke="#22c55e" strokeWidth="1.5" />
      <circle cx="64" cy="8" r="4" stroke="#22c55e" strokeWidth="1.5" fill="none" />
      <line x1="46" y1="10" x2="70" y2="10" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3,2" />
    </svg>
  ),
  zener: (
    <svg width="62" height="30" viewBox="0 0 62 30" fill="none">
      <line x1="0" y1="15" x2="14" y2="15" stroke="#94a3b8" strokeWidth="1.5" />
      <polygon points="14,4 14,26 34,15" fill="#f472b6" stroke="#f472b6" strokeWidth="1" />
      <line x1="34" y1="5" x2="34" y2="25" stroke="#f472b6" strokeWidth="2.5" />
      <line x1="27" y1="5" x2="34" y2="5" stroke="#f472b6" strokeWidth="2" />
      <line x1="34" y1="25" x2="41" y2="25" stroke="#f472b6" strokeWidth="2" />
      <line x1="34" y1="15" x2="62" y2="15" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
  switch: (
    <svg width="60" height="22" viewBox="0 0 60 22" fill="none">
      <line x1="0" y1="11" x2="14" y2="11" stroke="#94a3b8" strokeWidth="1.5" />
      <circle cx="16" cy="11" r="2.5" fill="#94a3b8" />
      <line x1="18" y1="11" x2="38" y2="4" stroke="#94a3b8" strokeWidth="1.5" />
      <circle cx="40" cy="11" r="2.5" fill="#94a3b8" />
      <line x1="42" y1="11" x2="60" y2="11" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
  ground: (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <line x1="15" y1="0" x2="15" y2="12" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="3" y1="12" x2="27" y2="12" stroke="#94a3b8" strokeWidth="2" />
      <line x1="7" y1="17" x2="23" y2="17" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="11" y1="22" x2="19" y2="22" stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  ),
}

const PRODUCT_IMAGES: Record<string, string> = {
  arduino: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Arduino_Uno_-_R3.jpg/160px-Arduino_Uno_-_R3.jpg',
  'raspberry pi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Raspberry_Pi_4_Model_B_-_Side.jpg/160px-Raspberry_Pi_4_Model_B_-_Side.jpg',
  esp32: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/ESP32_Espressif_ESP-WROOM-32_Devkitv1_front.jpg/160px-ESP32_Espressif_ESP-WROOM-32_Devkitv1_front.jpg',
  esp8266: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/ESP8266_01_800.jpg/160px-ESP8266_01_800.jpg',
  breadboard: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/400_points_breadboard.jpg/160px-400_points_breadboard.jpg',
  'servo motor': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Servomotor.jpg/120px-Servomotor.jpg',
  nema: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/StepperMotor.gif/120px-StepperMotor.gif',
}

type Visual = { kind: 'image'; url: string } | { kind: 'svg'; sym: ReactElement }

function getComponentVisual(label: string): Visual | null {
  const l = (label || '').toLowerCase()
  for (const [key, url] of Object.entries(PRODUCT_IMAGES)) {
    if (l.includes(key)) return { kind: 'image', url }
  }
  if (/\bzener\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.zener }
  if (/\bled\b|\blight.?emitting\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.led }
  if (/\bdiode\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.diode }
  if (/\bmosfet\b|\bfet\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.mosfet }
  if (/\btransistor\b|\bbjt\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.transistor }
  if (/\bresist(or|ance)\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.resistor }
  if (/\bcapacitor\b|\bcapacit/.test(l)) return { kind: 'svg', sym: CircuitSymbols.capacitor }
  if (/\btransformer\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.transformer }
  if (/\binductor\b|\bcoil\b|\bchoke\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.inductor }
  if (/\bbattery\b|\blipo\b|\blithium\b|\bcell\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.battery }
  if (/\bop.?amp\b|\bopamp\b|\bamplifier\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.opamp }
  if (/\brelay\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.relay }
  if (/\bcrystal\b|\boscillator\b|\bxtal\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.crystal }
  if (/\bfuse\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.fuse }
  if (/\bmotor\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.motor }
  if (/\bswitch\b|\brelay\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.switch }
  if (/\bground\b|\bgnd\b/.test(l)) return { kind: 'svg', sym: CircuitSymbols.ground }
  return null
}

function ComponentVisual({ label }: { label: string }) {
  const [imgFailed, setImgFailed] = useState(false)
  const visual = getComponentVisual(label)
  if (!visual) return null

  if (visual.kind === 'svg') {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '8px 4px 6px',
          background: 'rgba(0,0,0,0.35)',
          borderRadius: '6px',
          marginBottom: '6px',
          maxHeight: 56,
          overflow: 'hidden',
        }}
      >
        {visual.sym}
      </div>
    )
  }

  if (visual.kind === 'image' && !imgFailed) {
    return (
      <div
        style={{
          borderRadius: '6px',
          overflow: 'hidden',
          marginBottom: '6px',
          maxHeight: 56,
          background: 'rgba(0,0,0,0.35)',
        }}
      >
        <img
          src={visual.url}
          alt={label}
          onError={() => setImgFailed(true)}
          style={{ width: '100%', maxHeight: 56, objectFit: 'contain', display: 'block' }}
        />
      </div>
    )
  }

  return null
}

function ComponentNode({ data, isConnectable }: any) {
  const color = TYPE_COLORS[(data.type || '').toUpperCase()] || DEFAULT_COLOR
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.97)',
        border: `2px solid ${color}`,
        borderRadius: '10px',
        padding: '10px 12px',
        minWidth: '155px',
        maxWidth: '200px',
        boxShadow: `0 0 14px ${color}28`,
        fontFamily: 'inherit',
      }}
    >
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: color, border: 'none', width: 8, height: 8 }} />
      <ComponentVisual label={data.label} />
      <div
        style={{
          color,
          fontSize: '8px',
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '4px',
          opacity: 0.9,
        }}
      >
        {data.type}
      </div>
      <div
        style={{
          color: '#111827',
          fontSize: '11px',
          fontWeight: 700,
          lineHeight: '1.3',
          marginBottom: '4px',
        }}
      >
        {data.label}
      </div>
      {data.description && (
        <div style={{ color: '#94a3b8', fontSize: '9px', lineHeight: '1.4', marginBottom: '7px' }}>
          {data.description}
        </div>
      )}
      {data.pins?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {data.pins.map((pin: string, i: number) => (
            <span
              key={i}
              style={{
                background: `${color}18`,
                color,
                fontSize: '8px',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '999px',
                border: `1px solid ${color}35`,
                letterSpacing: '0.04em',
              }}
            >
              {pin}
            </span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: color, border: 'none', width: 8, height: 8 }} />
    </div>
  )
}

function DataEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, label }: any) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ stroke: '#22c55e', strokeWidth: 2 }} />
      {label && (
        <foreignObject x={labelX - 28} y={labelY - 9} width={56} height={18} style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '4px',
              color: '#4ade80',
              fontSize: '7px',
              fontWeight: 700,
              textAlign: 'center',
              padding: '1px 4px',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        </foreignObject>
      )}
    </>
  )
}

function PowerEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, label }: any) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ stroke: '#f97316', strokeWidth: 2, strokeDasharray: '7,4' }} />
      {label && (
        <foreignObject x={labelX - 28} y={labelY - 9} width={56} height={18} style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(249,115,22,0.15)',
              border: '1px solid rgba(249,115,22,0.3)',
              borderRadius: '4px',
              color: '#fb923c',
              fontSize: '7px',
              fontWeight: 700,
              textAlign: 'center',
              padding: '1px 4px',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        </foreignObject>
      )}
    </>
  )
}

const NODE_TYPES = { componentNode: ComponentNode }
const EDGE_TYPES = { dataEdge: DataEdge, powerEdge: PowerEdge }

function Legend() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '48px',
        left: '12px',
        zIndex: 10,
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '10px',
        padding: '10px 14px',
        minWidth: '120px',
      }}
    >
      <div
        style={{
          color: '#6b7280',
          fontSize: '8px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}
      >
        Wire Types
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="28" height="8">
            <line x1="0" y1="4" x2="28" y2="4" stroke="#22c55e" strokeWidth="2" />
            <polygon points="22,1 28,4 22,7" fill="#22c55e" />
          </svg>
          <span style={{ color: '#4ade80', fontSize: '9px', fontWeight: 600 }}>DATA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="28" height="8">
            <line x1="0" y1="4" x2="28" y2="4" stroke="#f97316" strokeWidth="2" strokeDasharray="5,3" />
            <polygon points="22,1 28,4 22,7" fill="#f97316" />
          </svg>
          <span style={{ color: '#fb923c', fontSize: '9px', fontWeight: 600 }}>POWER</span>
        </div>
      </div>
    </div>
  )
}

interface CanvasData {
  nodes?: any[]
  edges?: any[]
}

interface Props {
  canvasData: CanvasData
  title?: string
  style?: React.CSSProperties
}

export default function PrototypeCanvas({ canvasData, style = {} }: Props) {
  const initialNodes = useMemo(() => {
    if (!canvasData?.nodes?.length) return []
    const rfNodes = canvasData.nodes.map((n: any) => ({
      id: n.id,
      type: 'componentNode',
      data: { type: n.type, label: n.label, description: n.description, pins: n.pins || [] },
      position: { x: 0, y: 0 },
    }))
    return computeLayout(rfNodes)
  }, [canvasData])

  const initialEdges = useMemo(() => {
    if (!canvasData?.edges?.length) return []
    return canvasData.edges.map((e: any) => ({
      id: e.id || `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: e.wireType === 'POWER' ? 'powerEdge' : 'dataEdge',
      label: e.label || '',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.wireType === 'POWER' ? '#f97316' : '#22c55e',
        width: 12,
        height: 12,
      },
      animated: e.wireType === 'DATA',
    }))
  }, [canvasData])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  if (!canvasData?.nodes?.length) {
    return (
      <div
        style={{
          height: '320px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <p style={{ color: '#4b5563', fontSize: '13px' }}>Canvas unavailable for this invention.</p>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        height: '520px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)',
        background: '#f8fafc',
        ...style,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        colorMode="light"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={24} size={1} />
        <Controls
          style={{
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '8px',
          }}
        />
        <Legend />
      </ReactFlow>
    </div>
  )
}
