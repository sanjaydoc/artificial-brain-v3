// Auth stub — always "logged in" as default admin user. No actual auth.
import mongoose from 'mongoose'

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001')

export function requireAuth(req, _res, next) {
  req.auth = { userId: DEFAULT_USER_ID, role: 'Admin' }
  next()
}

export function requireAdmin(req, _res, next) {
  req.auth = req.auth || { userId: DEFAULT_USER_ID, role: 'Admin' }
  next()
}

export function optionalAuth(req, _res, next) {
  req.auth = { userId: DEFAULT_USER_ID, role: 'Admin' }
  next()
}

export function signToken() { return 'stub-token' }
