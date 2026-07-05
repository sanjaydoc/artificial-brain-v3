// Chat with Inventor Studio ASI.
// Port of inventor-studio-react-app pattern (chatSend / chatHistory / chatClearHistory).

import { Router } from 'express'
import { ChatMessage } from '../models/ChatMessage.js'
import { Invention } from '../models/Invention.js'
import { requireAuth } from '../middleware/auth.js'
import { chat as llmChat } from '../services/llm.js'

const router = Router()

router.use(requireAuth)

const HISTORY_LEN = 12

const SYSTEM_PROMPT = `You are Inventor Studio ASI — a multi-agent reasoning engine that helps people invent things.

You speak like a sharp, curious co-inventor:
- Concrete and specific. Name mechanisms, materials, components, prior art.
- Brief — 2-4 short paragraphs unless the user asks for depth.
- If the user wants you to invent something, suggest they say "/invent <concept>" — that triggers your dream pipeline.
- You don't repeat yourself, you don't say "I'd be happy to help".`.trim()

function extractInventRequest(text) {
  const t = String(text || '').trim()
  const slash = t.match(/^\/invent\s+(.+)/i)
  if (slash?.[1]) return slash[1].slice(0, 800).trim()
  const patterns = [
    /(?:please\s+)?(?:can you\s+)?(?:invent|design|build|propose)\s+(.+)/i,
  ]
  for (const p of patterns) {
    const m = t.match(p)
    if (m?.[1]) {
      const concept = m[1].replace(/[.!?]+$/, '').trim()
      if (concept.length < 8) return null
      return concept.slice(0, 800)
    }
  }
  return null
}

router.post('/', async (req, res) => {
  try {
    const userMessage = String(req.body?.message || '').trim().slice(0, 2000)
    if (!userMessage) return res.status(400).json({ message: 'message is required' })

    const userId = req.auth.userId
    const history = await ChatMessage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LEN)
      .lean()
    history.reverse()

    let queuedInvention = null
    const concept = extractInventRequest(userMessage)
    if (concept) {
      const inv = await Invention.create({ userId, seedConcept: concept, status: 'pending' })
      queuedInvention = { id: String(inv._id), concept }
    }

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }]
    for (const h of history) messages.push({ role: h.role, content: h.content })
    messages.push({ role: 'user', content: userMessage })

    let reply
    if (queuedInvention) {
      reply =
        `On it — I've queued an invention dream for "${queuedInvention.concept}".` +
        ` Watch it unfold at /inventions/${queuedInvention.id}.`
    } else {
      const r = await llmChat(messages, { role: 'agent', maxTokens: 600, temperature: 0.7 })
      reply = (r.content || '').trim()
    }

    await ChatMessage.create({ userId, role: 'user', content: userMessage })
    await ChatMessage.create({
      userId,
      role: 'assistant',
      content: reply,
      triggeredInventionId: queuedInvention?.id || null,
    })

    res.json({ reply, queued: queuedInvention })
  } catch (err) {
    console.error('[chat] POST error:', err)
    res.status(500).json({ message: err.message || 'Chat failed' })
  }
})

router.get('/history', async (req, res) => {
  try {
    const items = await ChatMessage.find({ userId: req.auth.userId })
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
    await ChatMessage.deleteMany({ userId: req.auth.userId })
    res.json({ cleared: true })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
