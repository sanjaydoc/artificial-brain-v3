// Inventor Studio — stripped for Artificial Brain (no auth, no admin, no subscription)
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dns from 'node:dns'
import { setGlobalDispatcher, Agent as UndiciAgent } from 'undici'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'

import inventionsRouter from './routes/inventions.js'
import dreamRouter from './routes/dream.js'
import streamRouter from './routes/stream.js'
import chatRouter from './routes/chat.js'
import vibeRouter from './routes/vibe.js'
import electronicsRouter from './routes/electronics.js'
import autonomousRouter from './routes/autonomous.js'
import publicRouter from './routes/public.js'
import { loadAgentConfig } from './services/utils/agentConfig.js'
import { chat as llmChat, embed as llmEmbed, getLlmStatus } from './services/llm.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env') })

try {
  setGlobalDispatcher(
    new UndiciAgent({
      headersTimeout: 120_000,
      bodyTimeout: 120_000,
      connectTimeout: 15_000,
    }),
  )
} catch {}

try {
  dns.setServers(['1.1.1.1', '8.8.8.8', '1.0.0.1'])
} catch {}

const PORT = process.env.PORT || 3003
const isProd = process.env.NODE_ENV === 'production'

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
      console.log(`[inventor-studio] mongo connected → ${m.connection.name}`)
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

async function bootstrap() {
  const app = express()

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  )

  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '50mb' }))

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      version: 'inventor-studio',
      node: process.version,
      timestamp: new Date().toISOString(),
    })
  })

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

  app.get('/api/llm/embed-probe', async (_req, res) => {
    try {
      const r = await llmEmbed('hello world')
      res.json({ ok: true, dim: r.dim, model: r.model, elapsedMs: r.elapsedMs })
    } catch (err) {
      res.status(502).json({ ok: false, error: err.message })
    }
  })

  // API routes (no auth, no admin, no subscription)
  app.use('/api/inventions', withDb, inventionsRouter)
  app.use('/api/dream', withDb, dreamRouter)
  app.use('/api/stream', withDb, streamRouter)
  app.use('/api/chat', withDb, chatRouter)
  app.use('/api/vibe', withDb, vibeRouter)
  app.use('/api/electronics', withDb, electronicsRouter)
  app.use('/api/autonomous', withDb, autonomousRouter)
  app.use('/api/public', withDb, publicRouter)

  // Frontend
  mountStatic(app)

  // Load agent config
  ensureDb()
    .then(loadAgentConfig)
    .catch((err) => console.warn('[inventor-studio] agent config load deferred:', err.message))

  app.listen(PORT, () => {
    console.log(`[inventor-studio] listening on :${PORT} (${isProd ? 'production' : 'development'})`)
  })
}

function mountStatic(app) {
  const distDir = path.resolve(__dirname, 'dist')
  app.use(express.static(distDir, { maxAge: '1h', index: false }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(distDir, 'index.html'), (err) => {
      if (err) {
        res.type('text/plain').status(503).send(
          'Inventor Studio backend is live, but no built frontend found. Run npm run build.',
        )
      }
    })
  })
}

bootstrap().catch((err) => {
  console.error('[inventor-studio] bootstrap failed:', err)
  process.exit(1)
})
