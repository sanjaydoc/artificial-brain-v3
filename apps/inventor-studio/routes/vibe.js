// Vibe coding — chat scoped to an invention + mode.
// SKELETON — filled in by the routes-port agent.

import { Router } from 'express'
import { VibeMessage } from '../models/VibeMessage.js'
import { requireAuth } from '../middleware/auth.js'
import { chat as llmChat } from '../services/llm.js'

const router = Router()
router.use(requireAuth)

router.post('/', async (req, res) => {
  try {
    const text = String(req.body?.message || '').trim().slice(0, 4000)
    const inventionId = req.body?.inventionId || null
    const mode = req.body?.mode || 'build'
    if (!text) return res.status(400).json({ message: 'message is required' })

    await VibeMessage.create({
      userId: req.auth.userId,
      inventionId,
      role: 'user',
      content: text,
      mode,
    })

    const recent = await VibeMessage.find({ userId: req.auth.userId, inventionId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
    recent.reverse()
    const messages = [
      { role: 'system', content: `You are a vibe-coding pair partner in "${mode}" mode.` },
      ...recent.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ]

    const r = await llmChat(messages, { role: 'agent', maxTokens: 800 })
    const reply = (r.content || '').trim()
    await VibeMessage.create({
      userId: req.auth.userId,
      inventionId,
      role: 'assistant',
      content: reply,
      mode,
    })
    res.json({ reply })
  } catch (err) {
    console.error('[vibe] POST error:', err)
    res.status(500).json({ message: err.message })
  }
})

router.get('/history', async (req, res) => {
  try {
    const inventionId = req.query.inventionId || null
    const items = await VibeMessage.find({ userId: req.auth.userId, inventionId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean()
    res.json({ messages: items.map((m) => ({ ...m, id: String(m._id) })) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/history', async (req, res) => {
  try {
    const inventionId = req.query.inventionId || null
    await VibeMessage.deleteMany({ userId: req.auth.userId, inventionId })
    res.json({ cleared: true })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
