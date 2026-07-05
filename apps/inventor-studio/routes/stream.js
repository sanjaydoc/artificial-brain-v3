// SSE streams — invention progress + autonomous consciousness.

import { Router } from 'express'
import { optionalAuth } from '../middleware/auth.js'
import { subscribeInvention } from './dream.js'
import { consciousnessEmitter } from '../services/autonomous/consciousness.js'

const router = Router()

function sseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}

router.get('/consciousness', optionalAuth, (req, res) => {
  sseHeaders(res)
  const send = (event, data) => {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }
  send('connected', { ts: Date.now() })

  const onLine = (line) => send('line', line)
  consciousnessEmitter.on('line', onLine)

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000)
  req.on('close', () => {
    clearInterval(heartbeat)
    consciousnessEmitter.off('line', onLine)
  })
})

// Frontend pattern (from source react-app): `es.onmessage = (e) => { const {type,data} = JSON.parse(e.data) }`.
// So we wrap each push as a single JSON object with no explicit event name —
// triggers the default 'message' event listener.
function inventionStreamHandler(req, res) {
  sseHeaders(res)
  const inventionId = req.params.id
  const send = (type, data) =>
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`)
  send('status', { id: inventionId, phase: 'connected' })

  const unsub = subscribeInvention(inventionId, (type, data) => send(type, data))

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000)
  req.on('close', () => {
    clearInterval(heartbeat)
    unsub?.()
  })
}

// Both URL shapes — `/api/stream/invention/:id` (legacy) AND `/api/stream/:id`
// (what the ported react-app code actually calls). Alias is safe because
// `/consciousness` is matched first (defined above).
router.get('/invention/:id', optionalAuth, inventionStreamHandler)
router.get('/:id', optionalAuth, inventionStreamHandler)

export default router
