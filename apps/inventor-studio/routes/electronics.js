// Electronics canvas — schematic + PCB.
// SKELETON — filled in by the routes-port agent.

import { Router } from 'express'
import { Circuit } from '../models/Circuit.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'

const router = Router()

// Public: read-only single circuit by id (only if isPublic)
router.get('/public/:id', optionalAuth, async (req, res) => {
  try {
    const c = await Circuit.findOne({ _id: req.params.id, isPublic: true }).lean()
    if (!c) return res.status(404).json({ message: 'Not found' })
    res.json({ circuit: { ...c, id: String(c._id) } })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.use(requireAuth)

router.get('/', async (req, res) => {
  const items = await Circuit.find({ userId: req.auth.userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
  res.json({ circuits: items.map((c) => ({ ...c, id: String(c._id) })) })
})

// Sanitize circuit_data: drop broken connections, dedupe, normalize ids.
// Mirrors ASI-1's sanitizeCircuit (src/routes/electronics.ts).
function sanitizeCircuit(circuitData) {
  const comps = circuitData?.components || []
  const normalized = comps.map((c, i) => ({
    ...c,
    id: String(c.id || `C${i + 1}`).trim(),
  }))
  const ids = new Set(normalized.map((c) => c.id))

  const seen = new Set()
  const conns = (circuitData?.connections || [])
    .map((conn) => ({
      from: String(conn.from || '').trim(),
      to: String(conn.to || '').trim(),
      fromPin: String(conn.fromPin || '').trim(),
      toPin: String(conn.toPin || '').trim(),
      type: conn.type === 'power' ? 'power' : 'data',
      label: String(conn.label || '').slice(0, 40),
    }))
    .filter((c) => c.from && c.to && c.from !== c.to && ids.has(c.from) && ids.has(c.to))
    .filter((c) => {
      const key = `${c.from}→${c.to}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  return { components: normalized, connections: conns }
}

// Source react-app calls POST /electronics/generate. v3 supports both shapes.
async function generateHandler(req, res) {
  try {
    const concept = String(req.body?.concept || req.body?.title || '').trim()
    if (!concept) {
      return res.status(400).json({ message: 'concept is required' })
    }

    // Try LLM-driven generation. Falls back to empty doc on parse failure so
    // the canvas page can still load (admin can hand-edit).
    let schematic = { nodes: [], edges: [] }
    let bom = []
    let title = concept.slice(0, 80)
    let description = concept

    try {
      const { reasoningLLM } = await import('../services/utils/llmAdapter.js')

      // Prompt ported from ASI-1 src/routes/electronics.ts buildCircuitPrompt.
      // Critically asks for BOTH components AND connections (wiring), with a
      // worked example so the LLM emits real wires not just a parts list.
      const prompt = `You are an expert electronics engineer. Design a complete, accurate wiring diagram for: "${concept}"

CRITICAL RULES — follow exactly or the diagram will be broken:
1. Every "id" in components must be a SHORT alphanumeric string like "FC1", "ESC1", "BAT1", "M1", "M2"
2. Every connection "from" and "to" must EXACTLY match an "id" in the components list — no typos, no missing IDs
3. Positions: x between 50-1100, y between 50-700. Cards are 190px wide and 200px tall. Minimum 220px gap between card x-positions in same row to avoid overlap
4. Every major component must have at least one connection
5. Output ONLY raw JSON — no markdown fences, no explanation, nothing else

Layout columns (use these x values):
- POWER column:    x=50
- ACTUATOR column: x=280   (space items 220px apart vertically)
- MCU column:      x=510, y=250
- SENSOR column:   x=740
- MODULE column:   x=970

Allowed "type" values: mcu, arduino, esp32, esp8266, stm32, sensor, sensor_imu, sensor_temp, sensor_distance, motor_dc, motor_servo, motor_stepper, esc, battery, buck_converter, regulator, relay, bluetooth, wifi, lora, gps, display, oled, lcd, resistor, capacitor, led, diode, transistor, buzzer, switch, camera, module

Allowed "category" values: MCU, SENSOR, ACTUATOR, POWER, MODULE, DISPLAY

Connection "type": "power" (for VCC/GND/voltage rails) or "data" (for signals/I2C/SPI/PWM/UART)

EXAMPLE of correct output for "Arduino LED blinker":
{"title":"Arduino LED Blinker","description":"Arduino Nano blinks an LED via current-limiting resistor","components":[{"id":"U1","type":"arduino","category":"MCU","name":"Microcontroller","model":"Arduino Nano","specs":"ATmega328P 5V 16MHz","quantity":1,"pins":["5V","GND","D13"],"x":510,"y":250},{"id":"R1","type":"resistor","category":"MODULE","name":"Current Limit Resistor","model":"220Ω 1/4W","specs":"220 ohm","quantity":1,"pins":["1","2"],"x":740,"y":250},{"id":"LED1","type":"led","category":"DISPLAY","name":"LED","model":"Red 5mm LED","specs":"2V 20mA","quantity":1,"pins":["A","K"],"x":970,"y":250},{"id":"BAT1","type":"battery","category":"POWER","name":"Power Supply","model":"USB 5V","specs":"5V via USB","quantity":1,"pins":["5V","GND"],"x":50,"y":250}],"connections":[{"from":"BAT1","fromPin":"5V","to":"U1","toPin":"5V","type":"power","label":"5V"},{"from":"BAT1","fromPin":"GND","to":"U1","toPin":"GND","type":"power","label":"GND"},{"from":"U1","fromPin":"D13","to":"R1","toPin":"1","type":"data","label":"PWM"},{"from":"R1","fromPin":"2","to":"LED1","toPin":"A","type":"data","label":""},{"from":"LED1","fromPin":"K","to":"U1","toPin":"GND","type":"power","label":"GND"}]}

Now design the full circuit for: "${concept}"
Include all necessary components (power supply, decoupling caps, pull-up resistors where needed).
Use realistic specific models (e.g. "Betaflight F4", "30A ESC", "2306 2400KV").
Output ONLY the JSON object:`

      const text = await reasoningLLM.invokeJson(prompt, 2500)
      let parsed = null
      try { parsed = JSON.parse(text) } catch {
        const m = String(text).match(/\{[\s\S]*\}/)
        if (m) try { parsed = JSON.parse(m[0]) } catch {}
      }
      if (parsed?.components?.length) {
        title = parsed.title || title
        description = parsed.description || description

        const sanitized = sanitizeCircuit(parsed)

        bom = sanitized.components.map((c) => ({
          id: c.id,
          name: c.name || 'Component',
          model: c.model || '',
          type: c.type || 'module',
          category: c.category || 'MODULE',
          specs: c.specs || '',
          quantity: c.quantity || 1,
          pins: Array.isArray(c.pins) ? c.pins : [],
        }))

        // schematic.nodes — keep LLM-provided x/y (fallback to grid layout)
        // and embed full component data so the frontend can render with icons.
        schematic = {
          nodes: sanitized.components.map((c, i) => ({
            id: c.id,
            type: 'component',
            position: {
              x: typeof c.x === 'number' ? c.x : 80 + (i % 4) * 240,
              y: typeof c.y === 'number' ? c.y : 80 + Math.floor(i / 4) * 240,
            },
            data: { ...c },
          })),
          // schematic.edges — store in source-shape so toSourceShape adapter
          // in the frontend reads them via `e.from`/`e.to` (NOT xyflow's
          // source/target). Both shapes are accepted by the adapter.
          edges: sanitized.connections.map((conn, i) => ({
            id: `e${i}`,
            from: conn.from,
            to: conn.to,
            fromPin: conn.fromPin,
            toPin: conn.toPin,
            type: conn.type,
            label: conn.label,
          })),
        }
      }
    } catch (e) {
      console.warn('[electronics] LLM generation failed, creating empty circuit:', e?.message)
    }

    const c = await Circuit.create({
      userId: req.auth.userId,
      title,
      description,
      schematic,
      pcb: { nodes: [], edges: [] },
      bom,
      inventionId: req.body?.inventionId || null,
    })
    const json = c.toJSON()
    // Frontend reads `data.circuitId || data.id` — provide both for compatibility.
    res.status(201).json({
      circuitId: String(c._id),
      id: String(c._id),
      circuit: json,
    })
  } catch (err) {
    console.error('[electronics] POST error:', err)
    res.status(500).json({ message: err.message })
  }
}

router.post('/', generateHandler)
router.post('/generate', generateHandler)

// POST /:id/regenerate — re-run LLM with the same concept, replace circuit data
router.post('/regenerate/:id', async (req, res) => {
  try {
    const c = await Circuit.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!c) return res.status(404).json({ message: 'Not found' })
    // Reuse the generate handler with the existing circuit's concept
    req.body = {
      concept: c.description || c.title,
      inventionId: c.inventionId || undefined,
    }
    // Delete the old one — generate handler creates a new doc
    await Circuit.deleteOne({ _id: c._id })
    return generateHandler(req, res)
  } catch (err) {
    console.error('[electronics] regenerate error:', err)
    res.status(500).json({ message: err.message })
  }
})

router.get('/:id', async (req, res) => {
  const c = await Circuit.findOne({ _id: req.params.id, userId: req.auth.userId })
  if (!c) return res.status(404).json({ message: 'Not found' })
  res.json({ circuit: c.toJSON() })
})

router.put('/:id', async (req, res) => {
  const c = await Circuit.findOneAndUpdate(
    { _id: req.params.id, userId: req.auth.userId },
    {
      title: req.body?.title,
      description: req.body?.description,
      schematic: req.body?.schematic,
      pcb: req.body?.pcb,
      bom: req.body?.bom,
    },
    { new: true },
  )
  if (!c) return res.status(404).json({ message: 'Not found' })
  res.json({ circuit: c.toJSON() })
})

router.delete('/:id', async (req, res) => {
  await Circuit.deleteOne({ _id: req.params.id, userId: req.auth.userId })
  res.json({ ok: true })
})

// Source react-app calls PATCH /electronics/:id/share (toggles isPublic).
// v3 also exposes PATCH /electronics/:id/visibility { isPublic } for explicit set.
router.patch('/:id/share', async (req, res) => {
  try {
    const c = await Circuit.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!c) return res.status(404).json({ message: 'Not found' })
    c.isPublic = !c.isPublic
    await c.save()
    res.json({ ok: true, isPublic: c.isPublic, id: String(c._id) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.patch('/:id/visibility', async (req, res) => {
  const isPublic = !!req.body?.isPublic
  const c = await Circuit.findOneAndUpdate(
    { _id: req.params.id, userId: req.auth.userId },
    { isPublic },
    { new: true },
  )
  if (!c) return res.status(404).json({ message: 'Not found' })
  res.json({ ok: true, isPublic, id: String(c._id) })
})

export default router
