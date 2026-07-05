// Razorpay subscription routes — port of ASI-1 src/routes/subscription.ts.
// Razorpay create-order/verify use the Razorpay node SDK if RAZORPAY_KEY_*
// env vars are set; otherwise return 503 so the frontend gets a clean error.

import { Router } from 'express'
import crypto from 'node:crypto'
import { User } from '../models/User.js'
import { Subscription } from '../models/Subscription.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

const TIER_PRICES_INR = { tier1: 999, tier2: 2999, tier3: 7999 }
const TIER_DAYS = { tier1: 30, tier2: 30, tier3: 30 }

router.get('/prices', (_req, res) => {
  res.json({
    tiers: Object.entries(TIER_PRICES_INR).map(([code, price]) => ({ tier: code, priceInr: price })),
  })
})

router.use(requireAuth)

router.get('/me', async (req, res) => {
  const u = await User.findById(req.auth.userId).select('subscriptionTier subscriptionExpiresAt')
  res.json({ tier: u?.subscriptionTier || 'free', expiresAt: u?.subscriptionExpiresAt || null })
})

router.get('/history', async (req, res) => {
  const items = await Subscription.find({ userId: req.auth.userId }).sort({ createdAt: -1 }).lean()
  res.json({ subscriptions: items.map((s) => ({ ...s, id: String(s._id) })) })
})

// POST /create-order — creates a Razorpay order if SDK + keys are configured.
router.post('/create-order', async (req, res) => {
  const { tier } = req.body || {}
  const price = TIER_PRICES_INR[tier]
  if (!price) return res.status(400).json({ message: 'Invalid tier' })

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ message: 'Razorpay not configured on server' })
  }

  let Razorpay
  try {
    ({ default: Razorpay } = await import('razorpay'))
  } catch {
    return res.status(503).json({ message: 'razorpay package not installed' })
  }

  try {
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
    const receipt = `inv_${Date.now()}`
    const order = await rzp.orders.create({
      amount: price * 100,
      currency: 'INR',
      receipt,
      notes: { tier, userId: String(req.auth.userId) },
    })
    await Subscription.create({
      userId: req.auth.userId,
      tier,
      priceInr: price,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      razorpayOrderId: order.id,
      paymentReference: receipt,
    })
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID })
  } catch (err) {
    console.error('[subscription] create-order failed:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// POST /verify — confirm payment via signature, mark sub completed, extend user expiry.
router.post('/verify', async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {}
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: 'Missing payment fields' })
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')
  if (expected !== razorpaySignature) {
    return res.status(400).json({ message: 'Invalid signature' })
  }

  const sub = await Subscription.findOne({ userId: req.auth.userId, razorpayOrderId })
  if (!sub) return res.status(404).json({ message: 'Order not found' })

  const now = new Date()
  const days = TIER_DAYS[sub.tier] || 30
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  sub.paymentStatus = 'completed'
  sub.razorpayPaymentId = razorpayPaymentId
  sub.razorpaySignature = razorpaySignature
  sub.isActive = true
  sub.startsAt = now
  sub.expiresAt = expiresAt
  await sub.save()

  await User.updateOne(
    { _id: req.auth.userId },
    { $set: { subscriptionTier: sub.tier, subscriptionExpiresAt: expiresAt } },
  )

  res.json({ ok: true, subscription: sub.toJSON() })
})

// POST /manual — admin-only manual subscription assignment.
router.post('/manual', requireAdmin, async (req, res) => {
  const { userId, tier, days = 30, notes = '' } = req.body || {}
  if (!userId || !TIER_PRICES_INR[tier]) return res.status(400).json({ message: 'Invalid userId or tier' })
  const now = new Date()
  const expiresAt = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000)
  const sub = await Subscription.create({
    userId,
    tier,
    priceInr: TIER_PRICES_INR[tier],
    paymentMethod: 'manual',
    paymentStatus: 'completed',
    isActive: true,
    startsAt: now,
    expiresAt,
    notes,
  })
  await User.updateOne({ _id: userId }, { $set: { subscriptionTier: tier, subscriptionExpiresAt: expiresAt } })
  res.json({ ok: true, subscription: sub.toJSON() })
})

export default router
