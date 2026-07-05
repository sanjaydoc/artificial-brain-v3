import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react'

const GRID_SIZE = 3
const DOTS = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i)
const HIT_RADIUS = 22

interface Props {
  onComplete: (pattern: number[]) => void
  minDots?: number
}

interface Point {
  x: number
  y: number
}

export default function PatternLock({ onComplete, minDots = 4 }: Props) {
  const [selected, setSelected] = useState<number[]>([])
  const [mousePos, setMousePos] = useState<Point | null>(null)
  const [drawing, setDrawing] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const dotsRef = useRef<(HTMLDivElement | null)[]>([])
  const drawingRef = useRef(false)
  const selectedRef = useRef<number[]>([])

  useEffect(() => {
    drawingRef.current = drawing
  }, [drawing])
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  const reset = () => {
    setSelected([])
    setMousePos(null)
    setDrawing(false)
  }

  const getDotCenter = useCallback((index: number): Point | null => {
    const el = dotsRef.current[index]
    const c = containerRef.current
    if (!el || !c) return null
    const cRect = c.getBoundingClientRect()
    const dRect = el.getBoundingClientRect()
    return {
      x: dRect.left - cRect.left + dRect.width / 2,
      y: dRect.top - cRect.top + dRect.height / 2,
    }
  }, [])

  const lines = useMemo(() => {
    const arr: { from: Point; to: Point }[] = []
    for (let i = 1; i < selected.length; i++) {
      const from = getDotCenter(selected[i - 1])
      const to = getDotCenter(selected[i])
      if (from && to) arr.push({ from, to })
    }
    return arr
  }, [selected, getDotCenter])

  const addDot = (index: number) => {
    setSelected((prev) => {
      if (prev.includes(index)) return prev
      if (prev.length === 0) return [index]
      const last = prev[prev.length - 1]
      const lastRow = Math.floor(last / GRID_SIZE),
        lastCol = last % GRID_SIZE
      const newRow = Math.floor(index / GRID_SIZE),
        newCol = index % GRID_SIZE
      const dr = newRow - lastRow,
        dc = newCol - lastCol
      const straightOrDiagonal =
        (dr === 0 || Math.abs(dr) === 2) && (dc === 0 || Math.abs(dc) === 2)
      if (straightOrDiagonal) {
        const mid =
          (lastRow + Math.sign(dr)) * GRID_SIZE + (lastCol + Math.sign(dc))
        if (!prev.includes(mid)) return [...prev, mid, index]
      }
      return [...prev, index]
    })
  }

  const dotIndexAtPoint = (clientX: number, clientY: number) => {
    for (let i = 0; i < dotsRef.current.length; i++) {
      const el = dotsRef.current[i]
      if (!el) continue
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2,
        cy = r.top + r.height / 2
      if ((clientX - cx) ** 2 + (clientY - cy) ** 2 <= HIT_RADIUS ** 2) return i
    }
    return -1
  }

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!drawingRef.current) return
    const cRect = containerRef.current?.getBoundingClientRect()
    if (!cRect) return
    setMousePos({ x: clientX - cRect.left, y: clientY - cRect.top })
    const idx = dotIndexAtPoint(clientX, clientY)
    if (idx !== -1) addDot(idx)
  }

  const handleEnd = useCallback(() => {
    if (!drawingRef.current) return
    setDrawing(false)
    setMousePos(null)
    const final = selectedRef.current
    if (final.length >= minDots) onComplete(final)
    else if (final.length > 0) setSelected([])
  }, [minDots, onComplete])

  useEffect(() => {
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchend', handleEnd)
    window.addEventListener('touchcancel', handleEnd)
    return () => {
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchend', handleEnd)
      window.removeEventListener('touchcancel', handleEnd)
    }
  }, [handleEnd])

  const lastCenter =
    selected.length > 0 ? getDotCenter(selected[selected.length - 1]) : null

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ width: 220, height: 220, touchAction: 'none' }}
        onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
        onTouchMove={(e) => {
          const t = e.touches[0]
          if (t) handlePointerMove(t.clientX, t.clientY)
        }}
      >
        <svg
          className="absolute inset-0 pointer-events-none"
          width={220}
          height={220}
        >
          {lines.map((l, i) => (
            <line
              key={i}
              x1={l.from.x}
              y1={l.from.y}
              x2={l.to.x}
              y2={l.to.y}
              stroke="#3b82f6"
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.8}
            />
          ))}
          {drawing && lastCenter && mousePos && (
            <line
              x1={lastCenter.x}
              y1={lastCenter.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#3b82f6"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.4}
              strokeDasharray="4 2"
            />
          )}
        </svg>
        <div className="absolute inset-0 grid grid-cols-3 p-4">
          {DOTS.map((index) => {
            const isActive = selected.includes(index)
            return (
              <div
                key={index}
                className="flex items-center justify-center"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setSelected([index])
                  setDrawing(true)
                }}
                onTouchStart={(e) => {
                  e.preventDefault()
                  setSelected([index])
                  setDrawing(true)
                }}
              >
                <div
                  ref={(el) => {
                    dotsRef.current[index] = el
                  }}
                  className="rounded-full transition-all duration-150 flex items-center justify-center cursor-pointer"
                  style={{
                    width: 30,
                    height: 30,
                    background: isActive
                      ? 'rgba(59,130,246,0.2)'
                      : 'rgba(0,0,0,0.06)',
                    border: isActive
                      ? '2px solid #3b82f6'
                      : '2px solid rgba(0,0,0,0.12)',
                    boxShadow: isActive
                      ? '0 0 12px rgba(59,130,246,0.4)'
                      : 'none',
                  }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      background: isActive
                        ? '#3b82f6'
                        : 'rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-muted-foreground text-xs text-center">
        {selected.length === 0
          ? 'Connect at least 4 dots'
          : selected.length < minDots
            ? `Need ${minDots - selected.length} more dot${minDots - selected.length > 1 ? 's' : ''}`
            : `${selected.length} dots — release to confirm`}
      </p>
      {selected.length > 0 && (
        <button onClick={reset} className="btn-ghost text-xs py-1.5 px-4">
          Reset
        </button>
      )}
    </div>
  )
}
