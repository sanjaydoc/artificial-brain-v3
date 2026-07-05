import jwt from 'jsonwebtoken'

/**
 * Verify JWT, attach { userId, role } to req.auth.
 * 401 on missing / invalid / expired.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided' })
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.auth = { userId: decoded.userId, role: decoded.role }
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

/**
 * Require admin role. Use AFTER requireAuth (or chain it).
 */
export function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}

/**
 * Optional auth — populates req.auth if a valid token is present, but doesn't
 * fail if missing. Used for endpoints that vary behavior by login status.
 */
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return next()
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.auth = { userId: decoded.userId, role: decoded.role }
  } catch {
    // ignore — invalid token = treat as anonymous
  }
  next()
}

/** 7-day JWT signed with HS256 */
export function signToken(userId, role) {
  return jwt.sign({ userId: String(userId), role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}
