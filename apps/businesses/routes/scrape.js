import { Router } from 'express'
import { Scrape } from '../models/Scrape.js'
import { Chunk } from '../models/Chunk.js'
import { requireAuth } from '../middleware/auth.js'
import { scrapeUrl } from '../services/scraper.js'
import { chunkText } from '../services/chunker.js'

const router = Router()

router.use(requireAuth)

const URL_RE = /^https?:\/\/[^\s]+$/i

function classify(url) {
  try {
    const host = new URL(url).host.toLowerCase()
    if (
      /(twitter\.com|x\.com|facebook\.com|youtube\.com|youtu\.be|tiktok\.com|reddit\.com|discord\.com|t\.me|telegram\.me|medium\.com|linkedin\.com|instagram\.com)/.test(
        host,
      )
    ) {
      return 'social'
    }
    return 'website'
  } catch {
    return 'website'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/scrape   body: { urls: string[] }  or  { url: string }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const raw = Array.isArray(req.body?.urls)
      ? req.body.urls
      : req.body?.url
        ? [req.body.url]
        : []
    const urls = raw
      .map((u) => String(u || '').trim())
      .filter(Boolean)
      .filter((u) => URL_RE.test(u))
      .slice(0, 10)

    if (!urls.length) {
      return res.status(400).json({ message: 'Provide one or more http(s) URLs in `urls`' })
    }

    const out = []
    for (const url of urls) {
      const kind = classify(url)
      const doc = await Scrape.create({
        userId: req.auth.userId,
        url,
        kind,
        status: 'fetching',
      })
      try {
        const result = await scrapeUrl(url)
        doc.httpStatus = result.status
        doc.title = result.title?.slice(0, 500) || ''
        doc.description = result.description?.slice(0, 1000) || ''

        const combined = [
          result.title ? `# ${result.title}` : '',
          result.description,
          result.text,
        ]
          .filter(Boolean)
          .join('\n\n')

        doc.textLength = combined.length
        doc.status = 'chunking'
        await doc.save()

        const pieces = chunkText(combined, { chunkSize: 1000, overlap: 200 })
        if (pieces.length) {
          await Chunk.insertMany(
            pieces.map((t, i) => ({
              userId: req.auth.userId,
              sourceType: 'scrape',
              sourceId: doc._id,
              ix: i,
              text: t,
              charLen: t.length,
            })),
            { ordered: false },
          )
        }
        doc.chunkCount = pieces.length
        doc.status = 'ready'
        await doc.save()
      } catch (err) {
        doc.status = 'error'
        doc.error = err.message?.slice(0, 500) || 'scrape failed'
        await doc.save()
      }
      out.push(doc.toJSON())
    }

    res.status(201).json({ scrapes: out })
  } catch (err) {
    console.error('[scrape] error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/', async (req, res) => {
  try {
    const items = await Scrape.find({ userId: req.auth.userId }).sort({ createdAt: -1 }).limit(200)
    res.json({ scrapes: items.map((d) => d.toJSON()) })
  } catch (err) {
    console.error('[scrape] list error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const s = await Scrape.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!s) return res.status(404).json({ message: 'Not found' })
    await Chunk.deleteMany({ sourceType: 'scrape', sourceId: s._id, userId: req.auth.userId })
    await s.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    console.error('[scrape] delete error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
