// Auth routes — copied from inventor-studio-v3
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { User } from '../models/User.js'
import { requireAuth, signToken } from '../middleware/auth.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const generateChallenge = () => crypto.randomBytes(32).toString('base64url')

function safeUserData(user) {
  const isAdmin = user.role === 'Admin'
  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
    isAdmin,
    biometricEnabled: !!user.biometricEnabled,
    passwordLoginEnabled: user.passwordLoginEnabled !== false,
    patternEnabled: !!user.patternEnabled,
    subscriptionTier: user.subscriptionTier || 'free',
    subscriptionExpiresAt: user.subscriptionExpiresAt || null,
    approvalStatus: user.approvalStatus || 'approved',
    apiKeyPrefix: user.apiKeyPrefix || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

// ── POST /signup ────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }
    if (!EMAIL_RE.test(String(email))) {
      return res.status(400).json({ message: 'Invalid email' })
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }

    const emailLc = String(email).toLowerCase()
    const existing = await User.findOne({ email: emailLc }).lean()
    if (existing) return res.status(409).json({ message: 'Email already registered' })

    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase()
    const role = adminEmail && emailLc === adminEmail ? 'Admin' : 'User'

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({
      email: emailLc,
      passwordHash,
      passwordLoginEnabled: true,
      role,
    })

    const token = signToken(user._id, user.role)
    res.status(201).json({ token, user: safeUserData(user) })
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' })
    }
    console.error('[auth] signup error:', err)
    res.status(500).json({ message: 'Server error during signup' })
  }
})

// ── GET /login-methods?email=foo@bar.com ───────────────────────────────────
router.get('/login-methods', async (req, res) => {
  try {
    const email = String(req.query.email || '').toLowerCase()
    if (!email) return res.status(400).json({ message: 'Email is required' })
    const user = await User.findOne({ email })
      .select('biometricEnabled passwordLoginEnabled patternEnabled')
      .lean()
    if (!user) return res.status(404).json({ message: 'Account not found' })
    res.json({
      biometricEnabled: !!user.biometricEnabled,
      passwordLoginEnabled: user.passwordLoginEnabled !== false,
      patternEnabled: !!user.patternEnabled,
    })
  } catch (err) {
    console.error('[auth] login-methods error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /login/password ────────────────────────────────────────────────────
router.post('/login/password', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }
    const user = await User.findOne({ email: String(email).toLowerCase() })
    if (!user) return res.status(401).json({ message: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' })

    const token = signToken(user._id, user.role)
    res.json({ token, user: safeUserData(user) })
  } catch (err) {
    console.error('[auth] login/password error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /login/pattern ─────────────────────────────────────────────────────
router.post('/login/pattern', async (req, res) => {
  try {
    const { email, pattern } = req.body || {}
    if (!email || !Array.isArray(pattern)) {
      return res.status(400).json({ message: 'Email and pattern array required' })
    }
    const user = await User.findOne({ email: String(email).toLowerCase() })
    if (!user || !user.patternEnabled || !user.patternHash) {
      return res.status(401).json({ message: 'Pattern login not set up' })
    }
    const valid = await bcrypt.compare(JSON.stringify(pattern), user.patternHash)
    if (!valid) return res.status(401).json({ message: 'Incorrect pattern' })

    const token = signToken(user._id, user.role)
    res.json({ token, user: safeUserData(user) })
  } catch (err) {
    console.error('[auth] login/pattern error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Backward-compat aliases ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }
    const user = await User.findOne({ email: String(email).toLowerCase() })
    if (!user) return res.status(401).json({ message: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' })

    const token = signToken(user._id, user.role)
    res.json({ token, user: safeUserData(user) })
  } catch (err) {
    console.error('[auth] login error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})
router.post('/pattern-login', (req, res, next) => {
  req.url = '/login/pattern'
  router.handle(req, res, next)
})

// ── GET /me ─────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user: safeUserData(user) })
  } catch (err) {
    console.error('[auth] me error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /setup/password ────────────────────────────────────────────────────
router.post('/setup/password', requireAuth, async (req, res) => {
  try {
    await User.updateOne({ _id: req.auth.userId }, { passwordLoginEnabled: true })
    res.json({ ok: true, message: 'Password login enabled' })
  } catch (err) {
    console.error('[auth] setup/password error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /setup/pattern ─────────────────────────────────────────────────────
router.post('/setup/pattern', requireAuth, async (req, res) => {
  try {
    const { pattern } = req.body || {}
    if (!Array.isArray(pattern) || pattern.length < 4) {
      return res.status(400).json({ message: 'Pattern must have at least 4 dots' })
    }
    const user = await User.findById(req.auth.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    user.patternHash = await bcrypt.hash(JSON.stringify(pattern), 12)
    user.patternEnabled = true
    await user.save()
    res.json({ ok: true, message: 'Pattern login enabled' })
  } catch (err) {
    console.error('[auth] setup/pattern error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /webauthn/challenge (authed) ───────────────────────────────────────
router.post('/webauthn/challenge', requireAuth, async (req, res) => {
  try {
    const challenge = generateChallenge()
    await User.updateOne({ _id: req.auth.userId }, { biometricChallenge: challenge })
    res.json({ challenge })
  } catch (err) {
    console.error('[auth] webauthn/challenge error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /webauthn/challenge-public (no auth — for biometric login) ───────
router.post('/webauthn/challenge-public', async (req, res) => {
  try {
    const { email } = req.body || {}
    const user = await User.findOne({ email: String(email || '').toLowerCase() })
    if (!user || !user.biometricEnabled) {
      return res.status(400).json({ message: 'Biometric not set up for this account' })
    }
    const challenge = generateChallenge()
    user.biometricChallenge = challenge
    await user.save()
    res.json({ challenge, credentialId: user.biometricCredentialId })
  } catch (err) {
    console.error('[auth] webauthn/challenge-public error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /webauthn/register (authed) ────────────────────────────────────────
router.post('/webauthn/register', requireAuth, async (req, res) => {
  try {
    const { credential } = req.body || {}
    const user = await User.findById(req.auth.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (!user.biometricChallenge) {
      return res
        .status(400)
        .json({ message: 'No pending challenge. Request a new challenge first.' })
    }
    if (!credential?.response?.clientDataJSON) {
      return res.status(400).json({ message: 'credential.response.clientDataJSON missing' })
    }

    const clientDataStr = Buffer.from(credential.response.clientDataJSON, 'base64url').toString()
    const clientData = JSON.parse(clientDataStr)

    if (clientData.challenge !== user.biometricChallenge) {
      return res.status(400).json({ message: 'Challenge mismatch' })
    }
    if (clientData.type !== 'webauthn.create') {
      return res.status(400).json({ message: 'Invalid credential type' })
    }

    user.biometricCredentialId = credential.id
    user.biometricEnabled = true
    user.biometricChallenge = null
    await user.save()
    res.json({ ok: true, message: 'Biometric authentication registered' })
  } catch (err) {
    console.error('[auth] webauthn/register error:', err)
    res.status(500).json({ message: 'Failed to register biometric' })
  }
})

// ── POST /webauthn/login ────────────────────────────────────────────────────
router.post('/webauthn/login', async (req, res) => {
  try {
    const { email, assertion } = req.body || {}
    const user = await User.findOne({ email: String(email || '').toLowerCase() })
    if (!user || !user.biometricEnabled || !user.biometricChallenge) {
      return res.status(401).json({ message: 'Biometric login not available' })
    }
    if (!assertion?.response?.clientDataJSON) {
      return res.status(400).json({ message: 'assertion.response.clientDataJSON missing' })
    }

    const clientDataStr = Buffer.from(assertion.response.clientDataJSON, 'base64url').toString()
    const clientData = JSON.parse(clientDataStr)

    if (clientData.challenge !== user.biometricChallenge) {
      return res.status(401).json({ message: 'Challenge mismatch' })
    }
    if (clientData.type !== 'webauthn.get') {
      return res.status(401).json({ message: 'Invalid assertion type' })
    }
    if (assertion.id !== user.biometricCredentialId) {
      return res.status(401).json({ message: 'Unknown credential' })
    }

    user.biometricChallenge = null
    await user.save()
    const token = signToken(user._id, user.role)
    res.json({ token, user: safeUserData(user) })
  } catch (err) {
    console.error('[auth] webauthn/login error:', err)
    res.status(500).json({ message: 'Biometric login failed' })
  }
})

// ── POST /api-key (issue) ───────────────────────────────────────────────────
router.post('/api-key', requireAuth, async (req, res) => {
  try {
    const raw = `iskey_${crypto.randomBytes(28).toString('base64url')}`
    const hash = crypto.createHash('sha256').update(raw).digest('hex')
    const prefix = raw.slice(0, 12)
    await User.updateOne({ _id: req.auth.userId }, { apiKeyHash: hash, apiKeyPrefix: prefix })
    res.json({ apiKey: raw, prefix })
  } catch (err) {
    console.error('[auth] api-key error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── DELETE /api-key (revoke) ────────────────────────────────────────────────
router.delete('/api-key', requireAuth, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.auth.userId },
      { $unset: { apiKeyHash: '', apiKeyPrefix: '' } },
    )
    res.json({ ok: true, revoked: true })
  } catch (err) {
    console.error('[auth] api-key revoke error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── Admin: list all users ────────────────────────────────────────────────
import { requireAdmin } from '../middleware/auth.js'

router.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('email role subscriptionTier approvalStatus passwordLoginEnabled patternEnabled biometricEnabled createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean()
    const list = users.map(u => ({
      id: String(u._id),
      email: u.email,
      role: u.role,
      tier: u.subscriptionTier,
      status: u.approvalStatus,
      auth: [
        u.passwordLoginEnabled && 'password',
        u.patternEnabled && 'pattern',
        u.biometricEnabled && 'biometric',
      ].filter(Boolean),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }))
    res.json({ ok: true, users: list, total: list.length })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Admin: update user role/status
router.put('/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role, approvalStatus, subscriptionTier } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ ok: false, error: 'user not found' })
    if (role) user.role = role
    if (approvalStatus) user.approvalStatus = approvalStatus
    if (subscriptionTier) user.subscriptionTier = subscriptionTier
    await user.save()
    res.json({ ok: true, user: { id: String(user._id), email: user.email, role: user.role, tier: user.subscriptionTier, status: user.approvalStatus } })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Admin: delete user
router.delete('/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await User.deleteOne({ _id: req.params.id })
    if (result.deletedCount === 0) return res.status(404).json({ ok: false, error: 'user not found' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

export default router
