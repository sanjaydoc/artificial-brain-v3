// Autonomous engine — start/stop/state/skip-cooldown.

import { Router } from 'express'
import { Consciousness } from '../models/Consciousness.js'
import { AutonomousTopic } from '../models/AutonomousTopic.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { startScheduler, stopScheduler, skipCooldown, getSchedulerStatus } from '../services/autonomous/scheduler.js'

const router = Router()

router.get('/consciousness', async (_req, res) => {
  let state = await Consciousness.findOne({ scope: 'global' }).lean()
  if (!state) {
    const created = await Consciousness.create({ scope: 'global' })
    state = created.toObject()
  }
  res.json({ state })
})

router.use(requireAuth, requireAdmin)

router.get('/state', async (_req, res) => {
  const state = await Consciousness.findOne({ scope: 'global' }).lean()
  res.json({ state, scheduler: getSchedulerStatus() })
})

router.post('/start', (_req, res) => res.json(startScheduler()))
router.post('/stop', (_req, res) => res.json(stopScheduler()))
router.post('/skip-cooldown', (_req, res) => res.json(skipCooldown()))

router.get('/topics', async (_req, res) => {
  const topics = await AutonomousTopic.find({}).sort({ createdAt: -1 }).limit(200).lean()
  res.json({ topics: topics.map((t) => ({ ...t, id: String(t._id) })) })
})

router.post('/topics', async (req, res) => {
  const { domain, topic, seed = '', enabled = true } = req.body || {}
  if (!domain || !topic) return res.status(400).json({ message: 'domain and topic are required' })
  const t = await AutonomousTopic.create({ domain, topic, seed, enabled })
  res.status(201).json({ topic: t.toJSON() })
})

router.delete('/topics/:id', async (req, res) => {
  await AutonomousTopic.deleteOne({ _id: req.params.id })
  res.json({ ok: true })
})

export default router
