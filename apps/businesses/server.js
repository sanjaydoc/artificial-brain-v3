// Businesses App — stripped from Sentiance (no auth, no admin, no pricing)
// Runs inside Docker as part of Artificial Brain stack.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dns from 'node:dns'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

import uploadsRouter from './routes/uploads.js'
import scrapeRouter from './routes/scrape.js'
import growthRouter from './routes/growth.js'
import chatRouter from './routes/chat.js'
import { loadAgentConfig } from './services/agentConfig.js'
import { chat as llmChat, getLlmStatus } from './services/llm.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env') })

try {
  dns.setServers(['1.1.1.1', '8.8.8.8', '1.0.0.1'])
} catch {}

const PORT = process.env.PORT || 3002
const isProd = process.env.NODE_ENV === 'production'

// ── Mongo: lazy single connection ──
let dbReadyPromise = null
async function ensureDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection
  if (mongoose.connection.readyState === 2 && dbReadyPromise) return dbReadyPromise
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing')
  dbReadyPromise = mongoose
    .connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
    })
    .then((m) => {
      console.log(`[businesses] mongo connected → ${m.connection.name}`)
      return m.connection
    })
    .catch((err) => {
      dbReadyPromise = null
      throw err
    })
  return dbReadyPromise
}

async function withDb(_req, res, next) {
  try {
    await ensureDb()
    next()
  } catch (err) {
    res.status(503).json({ message: 'Database unavailable', error: err.message })
  }
}

// ── Bootstrap ──
async function bootstrap() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '50mb' }))

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      node: process.version,
      timestamp: new Date().toISOString(),
    })
  })

  // API routes (no auth middleware)
  app.use('/api/uploads', withDb, uploadsRouter)
  app.use('/api/scrape', withDb, scrapeRouter)
  app.use('/api/growth', withDb, growthRouter)
  app.use('/api/chat', withDb, chatRouter)

  // Load agent config
  ensureDb()
    .then(loadAgentConfig)
    .catch((err) => console.warn('[businesses] agent config load deferred:', err.message))

  // LLM diagnostics
  app.get('/api/llm/status', (_req, res) => {
    res.json(getLlmStatus())
  })

  app.get('/api/llm/probe', async (_req, res) => {
    try {
      const r = await llmChat([{ role: 'user', content: 'Reply with just the word OK.' }], {
        role: 'agent',
        maxTokens: 10,
      })
      res.json({ ok: true, ...r, raw: undefined })
    } catch (err) {
      res.status(502).json({ ok: false, error: err.message })
    }
  })

  // Serve frontend
  mountStatic(app)

  app.listen(PORT, () => {
    console.log(`[businesses] listening on :${PORT} (${isProd ? 'production' : 'development'})`)
  })
}

function mountStatic(app) {
  const distDir = path.resolve(__dirname, 'dist')
  app.use(express.static(distDir, { maxAge: '1h', index: false }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(distDir, 'index.html'), (err) => {
      if (err) {
        res.type('text/plain').status(503).send('Businesses backend is live, but no built frontend found.')
      }
    })
  })
}

bootstrap().catch((err) => {
  console.error('[businesses] bootstrap failed:', err)
  process.exit(1)
})
