// Admin routes — user management + system-wide stats.
// SKELETON — filled in by the routes-port agent.

import { Router } from 'express'
import { User } from '../models/User.js'
import { Invention } from '../models/Invention.js'
import { Subscription } from '../models/Subscription.js'
import { SubscriptionSettings } from '../models/SubscriptionSettings.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import {
  ALL_AGENT_NAMES,
  getEnabledAgents,
  setAgentConfig,
} from '../services/utils/agentConfig.js'

const router = Router()
router.use(requireAuth, requireAdmin)

router.get('/stats', async (_req, res) => {
  const [users, inventions, completedInventions, paid] = await Promise.all([
    User.countDocuments({}),
    Invention.countDocuments({}),
    Invention.countDocuments({ status: 'complete' }),
    Subscription.countDocuments({ paymentStatus: 'completed' }),
  ])
  res.json({
    totalUsers: users,
    totalInventions: inventions,
    completeInventions: completedInventions,
    paidSubscriptions: paid,
  })
})

router.get('/users', async (req, res) => {
  const search = String(req.query.search || '').trim()
  const filter = search ? { email: new RegExp(search, 'i') } : {}
  const items = await User.find(filter).sort({ createdAt: -1 }).limit(200).lean()
  res.json({ users: items.map((u) => ({ ...u, id: String(u._id) })) })
})

router.delete('/users/:id', async (req, res) => {
  await User.deleteOne({ _id: req.params.id })
  res.json({ ok: true })
})

router.post('/users/:id/approve', async (req, res) => {
  await User.updateOne({ _id: req.params.id }, { approvalStatus: 'approved' })
  res.json({ ok: true })
})

// Recent inventions list + filter — used by Lite Admin
router.get('/inventions', async (req, res) => {
  const status = String(req.query.status || '').trim()
  const filter = status ? { status } : {}
  const items = await Invention.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .select('seedConcept domain mode status isGuest userId createdAt updatedAt totalElapsedMs')
    .lean()
  res.json({ inventions: items.map((i) => ({ ...i, id: String(i._id) })) })
})

router.delete('/inventions/:id', async (req, res) => {
  await Invention.deleteOne({ _id: req.params.id })
  res.json({ ok: true })
})

// ── Subscription tier management ─────────────────────────────────────────────
// Each tier (tier1/tier2/tier3) has a single SubscriptionSettings doc. Admins
// edit price + name + features. The "free" tier is implicit, no row.

// GET /api/admin/subscription-settings — list all tier configs
router.get('/subscription-settings', async (_req, res) => {
  try {
    const settings = await SubscriptionSettings.find({}).sort({ priceInr: 1 }).lean()
    res.json({ settings: settings.map((s) => ({ ...s, id: String(s._id) })) })
  } catch (err) {
    console.error('[admin] subscription-settings GET error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/admin/subscription-settings/:tier — update price/name/features
router.put('/subscription-settings/:tier', async (req, res) => {
  try {
    const { tier } = req.params
    if (!['tier1', 'tier2', 'tier3'].includes(tier)) {
      return res.status(400).json({ message: 'Invalid tier (must be tier1, tier2, or tier3)' })
    }
    const update = {}
    if (req.body?.priceInr !== undefined) {
      const n = Number(req.body.priceInr)
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: 'priceInr must be a non-negative number' })
      }
      update.priceInr = n
    }
    if (typeof req.body?.name === 'string') update.name = req.body.name.slice(0, 80)
    if (Array.isArray(req.body?.features)) {
      update.features = req.body.features.map((f) => String(f).slice(0, 200)).slice(0, 30)
    }
    if (req.body?.inventionLimit !== undefined) {
      const n = Number(req.body.inventionLimit)
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: 'inventionLimit must be a non-negative number (0 = unlimited)' })
      }
      update.inventionLimit = n
    }
    if (typeof req.body?.isActive === 'boolean') update.isActive = req.body.isActive

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No updatable fields provided' })
    }

    const doc = await SubscriptionSettings.findOneAndUpdate(
      { tier },
      { $set: update },
      { new: true, upsert: false },
    )
    if (!doc) return res.status(404).json({ message: 'Tier not found — run seedSubscriptionSettings()' })
    res.json({ setting: { ...doc.toJSON(), id: String(doc._id) } })
  } catch (err) {
    console.error('[admin] subscription-settings PUT error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── Agent activation ────────────────────────────────────────────────────────
// 10 dream-lens agents (analogical, inversion, etc.). Admin can disable any
// subset to make the dream pipeline lighter / cheaper. At least one must stay
// enabled. Mirrors ASI-1's /api/admin/agent-config.

router.get('/agent-config', (_req, res) => {
  res.json({
    enabled: getEnabledAgents(),
    all: ALL_AGENT_NAMES,
  })
})

router.put('/agent-config', async (req, res) => {
  try {
    const { enabled } = req.body || {}
    if (!Array.isArray(enabled)) {
      return res.status(400).json({ message: 'enabled must be an array of agent names' })
    }
    const result = await setAgentConfig(enabled)
    res.json({ enabled: result, all: ALL_AGENT_NAMES })
  } catch (err) {
    console.error('[admin] agent-config PUT error:', err)
    res.status(400).json({ message: err.message || 'Failed to update agent config' })
  }
})

// POST /api/admin/users/:id/subscription — manually grant a subscription to a user
// body: { tier: 'free' | 'tier1' | 'tier2' | 'tier3', months?: number }
// Creates a Subscription log entry + updates the User's subscriptionTier and expires-at.
router.post('/users/:id/subscription', async (req, res) => {
  try {
    const { tier, months = 1 } = req.body || {}
    if (!['free', 'tier1', 'tier2', 'tier3'].includes(tier)) {
      return res.status(400).json({ message: 'Invalid tier' })
    }
    const m = Math.max(1, Math.min(120, parseInt(String(months), 10) || 1))

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    let expiresAt = null
    let priceInr = 0

    if (tier === 'free') {
      user.subscriptionTier = 'free'
      user.subscriptionExpiresAt = null
    } else {
      const setting = await SubscriptionSettings.findOne({ tier }).lean()
      priceInr = setting?.priceInr || 0
      expiresAt = new Date(Date.now() + m * 30 * 24 * 60 * 60 * 1000)
      user.subscriptionTier = tier
      user.subscriptionExpiresAt = expiresAt
    }
    await user.save()

    // Log the manual grant
    if (tier !== 'free') {
      await Subscription.create({
        userId: user._id,
        tier,
        priceInr,
        paymentMethod: 'admin',
        paymentStatus: 'completed',
        startsAt: new Date(),
        expiresAt,
        isActive: true,
      }).catch((e) => console.warn('[admin] subscription log create:', e.message))
    }

    res.json({
      ok: true,
      user: {
        id: String(user._id),
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
      },
    })
  } catch (err) {
    console.error('[admin] users/:id/subscription error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
