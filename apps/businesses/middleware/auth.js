// Auth stub — no authentication, always returns a default user.
import mongoose from 'mongoose'

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001')

export function requireAuth(req, _res, next) {
  req.auth = { userId: DEFAULT_USER_ID, role: 'Admin' }
  next()
}

export function requireAdmin(req, _res, next) {
  req.auth = { userId: DEFAULT_USER_ID, role: 'Admin' }
  next()
}

export function signToken() {
  return 'stub-token'
}
