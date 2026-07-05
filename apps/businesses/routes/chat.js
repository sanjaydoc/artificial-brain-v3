// Conversational chat with Sentiance ASI. Adapted from inventor-studio's chat.ts —
// same pattern (POST send / GET history / DELETE clear) but adapted for businesses:
//   • Context = user's uploaded chunks + scraped chunks (round-robin, capped)
//   • Intent detection — "/growth" command or natural-language asks → queues a real
//     growth analysis via startGrowthLoop and returns the growthId.

import { Router } from 'express'
import { ChatMessage } from '../models/ChatMessage.js'
import { Chunk } from '../models/Chunk.js'
import { Upload } from '../models/Upload.js'
import { Scrape } from '../models/Scrape.js'
import { requireAuth } from '../middleware/auth.js'
import { chat as llmChat } from '../services/llm.js'
import { startGrowthLoop, assertWithinPlanLimit } from '../services/growthLoop.js'

const router = Router()

router.use(requireAuth)

const HISTORY_LEN = 12
const CONTEXT_CHAR_BUDGET = 3500 // tighter than growth loop — chat needs token room

// ── Intent detection — does the message want a real growth analysis? ────────
function extractGrowthRequest(text) {
  const t = String(text || '').trim()
  // Slash command takes priority
  const slash = t.match(/^\/growth\s+(.+)/i)
  if (slash?.[1]) return slash[1].slice(0, 800).trim()

  // Natural-language patterns
  const patterns = [
    /(?:please\s+)?(?:can you\s+)?(?:start|run|launch|kick off|begin)\s+(?:a\s+)?(?:growth\s+)?(?:analysis|report|plan)\s+(?:for|on|to)\s+(.+)/i,
    /(?:please\s+)?(?:help\s+me\s+)?grow\s+(?:my\s+)?(.+)/i,
    /(?:please\s+)?analyze\s+(?:my\s+)?(?:business\s+)?(?:to\s+)?(.+)/i,
    /(?:please\s+)?build\s+(?:a\s+)?growth\s+plan\s+(?:for\s+)?(.+)/i,
  ]
  for (const p of patterns) {
    const m = t.match(p)
    if (m?.[1]) {
      const concept = m[1].replace(/[.!?]+$/, '').trim()
      // If too short to be meaningful, skip
      if (concept.length < 8) return null
      return concept.slice(0, 800)
    }
  }
  return null
}

async function buildBusinessContext(userId) {
  const [uploads, scrapes] = await Promise.all([
    Upload.find({ userId, status: 'ready' }).sort({ createdAt: -1 }).limit(10).lean(),
    Scrape.find({ userId, status: 'ready' }).sort({ createdAt: -1 }).limit(10).lean(),
  ])
  const sourceIds = [
    ...uploads.map((u) => ({ id: u._id, label: `Upload: ${u.fileName}` })),
    ...scrapes.map((s) => ({ id: s._id, label: `Web: ${s.title || s.url}` })),
  ]
  if (!sourceIds.length) return ''

  const chunks = await Chunk.find({
    userId,
    sourceId: { $in: sourceIds.map((s) => s.id) },
  })
    .sort({ ix: 1 })
    .limit(20)
    .lean()

  const lines = []
  let used = 0
  for (const c of chunks) {
    const block = c.text + '\n\n'
    if (used + block.length > CONTEXT_CHAR_BUDGET) {
      const room = CONTEXT_CHAR_BUDGET - used
      if (room > 200) lines.push(c.text.slice(0, room) + '…')
      break
    }
    lines.push(c.text)
    used += block.length
  }
  return lines.join('\n\n').trim()
}

const SYSTEM_PROMPT = `You are Sentiance ASI — a multi-agent reasoning system that helps business owners grow their businesses.

You speak like a sharp strategic advisor:
- Concrete, no platitudes. Name specific tactics, channels, numbers.
- Brief — 2-4 short paragraphs unless the user asks for depth.
- If the user uploaded business files or scraped their site, lean on that context.
- If the user wants a full structured growth plan, suggest they say "/growth <their goal>" — that triggers your 10-agent reasoning pipeline and produces a downloadable PDF report.
- You don't repeat yourself, you don't say "I'd be happy to help".`.trim()

// ── POST /api/chat — send a message, get a reply ────────────────────────────
router.post('/', async (req, res) => {
  try {
    const userMessage = String(req.body?.message || '').trim().slice(0, 2000)
    if (!userMessage) return res.status(400).json({ message: 'message is required' })
    const userId = req.auth.userId

    // Run history fetch + context build in parallel
    const [history, businessContext] = await Promise.all([
      ChatMessage.find({ userId }).sort({ createdAt: -1 }).limit(HISTORY_LEN).lean(),
      buildBusinessContext(userId).catch(() => ''),
    ])
    history.reverse()

    // Detect a growth-analysis intent BEFORE we hit the LLM
    let queuedGrowth = null
    const growthConcept = extractGrowthRequest(userMessage)
    if (growthConcept) {
      // Plan-gating — surface limit hit as a chat message, not a 402
      try {
        await assertWithinPlanLimit(userId)
        const g = await startGrowthLoop({ userId, concept: growthConcept })
        queuedGrowth = { id: String(g._id), concept: growthConcept }
      } catch (err) {
        if (err.code === 'PLAN_LIMIT') {
          // Tell the user nicely; don't kick off the loop
          const reply =
            `You've used your ${err.tier} tier's analysis limit (${err.limit} per period). ` +
            `Upgrade your plan from /pricing to start a new growth report.`
          await ChatMessage.create({ userId, role: 'user', content: userMessage })
          await ChatMessage.create({ userId, role: 'assistant', content: reply })
          return res.json({ reply, queued: null, planLimit: true })
        }
        throw err
      }
    }

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }]
    if (businessContext) {
      messages.push({
        role: 'system',
        content: `THE USER'S BUSINESS (uploaded files + scraped sites):\n${businessContext}`,
      })
    }
    for (const h of history) messages.push({ role: h.role, content: h.content })
    messages.push({ role: 'user', content: userMessage })

    let reply
    if (queuedGrowth) {
      // Skip the LLM round-trip — just acknowledge the queued analysis
      reply =
        `Got it — I've started a 10-agent growth analysis on: "${queuedGrowth.concept}".` +
        ` Track the live feed at /growth/${queuedGrowth.id} or watch the next 90s here.`
    } else {
      const r = await llmChat(messages, { role: 'agent', maxTokens: 600, temperature: 0.7 })
      reply = (r.content || '').trim()
    }

    // Persist both messages
    await ChatMessage.create({ userId, role: 'user', content: userMessage })
    await ChatMessage.create({
      userId,
      role: 'assistant',
      content: reply,
      triggeredGrowthId: queuedGrowth?.id || null,
    })

    res.json({ reply, queued: queuedGrowth })
  } catch (err) {
    console.error('[chat] POST error:', err)
    res.status(500).json({ message: err.message || 'Chat failed' })
  }
})

// ── GET /api/chat/history ────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const items = await ChatMessage.find({ userId: req.auth.userId })
      .sort({ createdAt: 1 })
      .limit(100)
    res.json({ messages: items.map((m) => m.toJSON()) })
  } catch (err) {
    console.error('[chat] history error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── DELETE /api/chat/history — clear conversation ───────────────────────────
router.delete('/history', async (req, res) => {
  try {
    await ChatMessage.deleteMany({ userId: req.auth.userId })
    res.json({ cleared: true })
  } catch (err) {
    console.error('[chat] delete history error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
