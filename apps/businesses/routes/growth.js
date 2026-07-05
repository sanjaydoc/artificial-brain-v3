import { Router } from 'express'
import { Growth } from '../models/Growth.js'
import { requireAuth } from '../middleware/auth.js'
import { startGrowthLoop, subscribe } from '../services/growthLoop.js'

const router = Router()

router.use(requireAuth)

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/growth   body: { concept }
// Kicks off a new growth analysis. Returns the new id immediately;
// client subscribes to /api/growth/:id/stream for live progress.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const concept = String(req.body?.concept || '').trim()
    if (!concept || concept.length < 8) {
      return res
        .status(400)
        .json({ message: 'Provide a concept/goal in `concept` (min 8 chars)' })
    }
    if (concept.length > 2000) {
      return res.status(400).json({ message: 'Concept is too long (max 2000 chars)' })
    }

    const doc = await startGrowthLoop({ userId: req.auth.userId, concept })
    res.status(202).json({ growth: doc.toJSON() })
  } catch (err) {
    if (err.code === 'PLAN_LIMIT') {
      return res.status(402).json({
        code: 'PLAN_LIMIT',
        message: err.message,
        tier: err.tier,
        limit: err.limit,
      })
    }
    console.error('[growth] start error:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/growth — list current user's analyses
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const items = await Growth.find({ userId: req.auth.userId })
      .select('-agents -synthesis -critique -plan -error')
      .sort({ createdAt: -1 })
      .limit(50)
    res.json({ growths: items.map((d) => d.toJSON()) })
  } catch (err) {
    console.error('[growth] list error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/growth/:id — full analysis (for the report view)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doc = await Growth.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!doc) return res.status(404).json({ message: 'Not found' })
    res.json({ growth: doc.toJSON() })
  } catch (err) {
    console.error('[growth] get error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/growth/:id/stream — Server-Sent Events of the loop progress.
// Replays past events first (for late-joining clients), then streams live.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/stream', async (req, res) => {
  // Verify the user owns this growth
  const exists = await Growth.findOne({
    _id: req.params.id,
    userId: req.auth.userId,
  })
    .select('_id status')
    .lean()
  if (!exists) {
    return res.status(404).json({ message: 'Not found' })
  }

  // SSE headers — same set we validated against cPanel's reverse proxy
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (evt) => {
    res.write(`event: ${evt.type}\n`)
    res.write(`data: ${JSON.stringify(evt.data)}\n\n`)
  }

  // Heartbeat every 15s so the proxy doesn't time out the connection
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`)
  }, 15000)

  let unsubscribe = null
  try {
    unsubscribe = subscribe(String(req.params.id), (evt) => {
      send(evt)
      if (evt.type === 'complete' || evt.type === 'error') {
        clearInterval(heartbeat)
        try { unsubscribe?.() } catch {}
        res.end()
      }
    })

    // If the loop already completed before this client subscribed and the
    // bus has been dropped, the subscribe() call returns no replay events.
    // Send the persisted final state so the client at least sees the result.
    if (exists.status === 'complete' || exists.status === 'error') {
      // Late client — bus may already be gone. Push terminal event manually.
      setTimeout(() => {
        send({ type: exists.status === 'error' ? 'error' : 'complete', data: { id: String(exists._id) } })
        clearInterval(heartbeat)
        try { unsubscribe?.() } catch {}
        res.end()
      }, 200)
    }
  } catch (err) {
    clearInterval(heartbeat)
    try { unsubscribe?.() } catch {}
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`)
    res.end()
  }

  req.on('close', () => {
    clearInterval(heartbeat)
    try { unsubscribe?.() } catch {}
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/growth/:id/visibility   body: { isPublic: boolean }
// Owner toggles whether their growth plan is reachable at /share/:id without auth.
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/visibility', async (req, res) => {
  try {
    const isPublic = !!req.body?.isPublic
    const doc = await Growth.findOneAndUpdate(
      { _id: req.params.id, userId: req.auth.userId },
      { $set: { isPublic } },
      { new: true },
    )
    if (!doc) return res.status(404).json({ message: 'Not found' })
    res.json({ ok: true, isPublic: doc.isPublic, id: String(doc._id) })
  } catch (err) {
    console.error('[growth] visibility error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/growth/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Growth.findOneAndDelete({
      _id: req.params.id,
      userId: req.auth.userId,
    })
    if (!doc) return res.status(404).json({ message: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error('[growth] delete error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
