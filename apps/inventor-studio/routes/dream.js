// Dream loop — start a new dream + queue status. Ported from ASI-1 src/routes/dream.ts.

import { Router } from 'express'
import { Invention } from '../models/Invention.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { runDreamLoop } from '../services/dreamLoop.js'

const router = Router()

let queueLength = 0
const inFlight = new Set()

export function getQueueStatus() {
  return { length: queueLength, inFlight: inFlight.size }
}

// Light-weight in-memory pub-sub for stream.js
const inventionEmitters = new Map()

function getEmitter(inventionId) {
  let e = inventionEmitters.get(String(inventionId))
  if (!e) {
    const subs = new Set()
    e = {
      emit(_id, type, data) {
        for (const cb of subs) {
          try { cb(type, data) } catch {}
        }
      },
      subscribe(cb) { subs.add(cb); return () => subs.delete(cb) },
    }
    inventionEmitters.set(String(inventionId), e)
  }
  return e
}

export function subscribeInvention(inventionId, cb) {
  return getEmitter(inventionId).subscribe(cb)
}

async function fireDreamPipeline(invention, domain, mode, agentCount = 10) {
  const id = String(invention._id)
  inFlight.add(id)
  queueLength = Math.max(0, queueLength - 1)
  try {
    await runDreamLoop({
      inventionId: id,
      concept: invention.seedConcept,
      mode,
      userId: String(invention.userId),
      domain,
      emitter: getEmitter(id),
      agentCount,
    })
  } catch (err) {
    console.error(`[dream] pipeline failed for ${id}:`, err.message)
  } finally {
    inFlight.delete(id)
  }
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const seedConcept = String(req.body?.seedConcept || req.body?.concept || '').trim()
    const domain = String(req.body?.domain || 'other')
    const mode = String(req.body?.mode || 'dream')
    const agentCount = Number(req.body?.agentCount) || 10
    if (!seedConcept) return res.status(400).json({ message: 'seedConcept is required' })

    const inv = await Invention.create({
      userId: req.auth.userId,
      seedConcept,
      domain: ['software', 'hardware', 'life-science', 'hybrid', 'other'].includes(domain) ? domain : 'other',
      mode: ['dream', 'invent', 'evolve'].includes(mode) ? mode : 'dream',
      status: 'pending',
    })
    queueLength += 1

    setImmediate(() => fireDreamPipeline(inv, domain === 'other' ? 'hybrid' : domain, mode, agentCount))

    res.status(202).json({
      inventionId: String(inv._id),
      invention: inv.toJSON(),
      queueLength,
    })
  } catch (err) {
    console.error('[dream] POST error:', err)
    res.status(500).json({ message: err.message })
  }
})

// Anonymous demo dream — no auth required. The homepage Hero submits a concept
// here, then redirects to /guest-stream/:id where the SSE stream renders the
// pipeline live. The invention is flagged isGuest so it doesn't bleed into any
// real user's library.
router.post('/guest', optionalAuth, async (req, res) => {
  try {
    const concept = String(req.body?.concept || req.body?.seedConcept || '').trim()
    if (!concept) return res.status(400).json({ message: 'concept is required' })
    if (concept.length < 8) {
      return res.status(400).json({ message: 'concept must be at least 8 characters' })
    }

    const inv = await Invention.create({
      userId: null,
      isGuest: true,
      seedConcept: concept,
      domain: 'other',
      mode: 'dream',
      status: 'pending',
    })
    queueLength += 1
    setImmediate(() => fireDreamPipeline(inv, 'hybrid', 'dream'))

    res.status(202).json({
      inventionId: String(inv._id),
      invention: inv.toJSON(),
      queueLength,
    })
  } catch (err) {
    console.error('[dream] guest POST error:', err)
    res.status(500).json({ message: err.message })
  }
})

router.get('/queue', (_req, res) => res.json(getQueueStatus()))

export default router
