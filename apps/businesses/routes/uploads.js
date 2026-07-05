import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sanitize from 'sanitize-filename'
import crypto from 'node:crypto'

import { Upload } from '../models/Upload.js'
import { Chunk } from '../models/Chunk.js'
import { requireAuth } from '../middleware/auth.js'
import { extractText, detectKind } from '../services/parsers.js'
import { chunkText } from '../services/chunker.js'

const __filename = fileURLToPath(import.meta.url)
const UPLOADS_ROOT = path.resolve(path.dirname(__filename), '..', 'uploads')

// 50 MB ceiling — same as ASI-1 chat limit
const MAX_BYTES = 50 * 1024 * 1024

const ALLOWED = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'application/json',
])

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const dir = path.join(UPLOADS_ROOT, String(req.auth.userId))
      await fs.mkdir(dir, { recursive: true })
      cb(null, dir)
    } catch (err) {
      cb(err, '')
    }
  },
  filename: (_req, file, cb) => {
    const safe = sanitize(file.originalname).slice(0, 120) || 'file'
    const stamp = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    cb(null, `${stamp}__${safe}`)
  },
})

const fileFilter = (_req, file, cb) => {
  if (ALLOWED.has(file.mimetype)) return cb(null, true)
  // Allow if extension maps to something we know how to parse
  const kind = detectKind(file.mimetype, file.originalname)
  if (kind !== 'unsupported') return cb(null, true)
  cb(new Error(`Unsupported file type: ${file.mimetype || file.originalname}`))
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 10 },
  fileFilter,
})

const router = Router()

router.use(requireAuth)

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/uploads  (multipart, field name "files")
// Saves files to disk under uploads/<userId>/, parses, chunks, persists chunks.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ message: 'No files uploaded (field name must be "files")' })
    }

    const out = []
    for (const f of req.files) {
      // Create the Upload record first (status: uploaded)
      const u = await Upload.create({
        userId: req.auth.userId,
        fileName: f.originalname,
        storedName: f.filename,
        mimeType: f.mimetype,
        size: f.size,
        diskPath: f.path,
        status: 'parsing',
      })

      // Parse + chunk + persist chunks
      try {
        const { text } = await extractText({
          diskPath: f.path,
          mimeType: f.mimetype,
          fileName: f.originalname,
        })
        u.extractedTextLength = text.length
        u.status = 'chunking'
        await u.save()

        const pieces = chunkText(text, { chunkSize: 1000, overlap: 200 })

        if (!pieces.length) {
          u.chunkCount = 0
          u.status = 'error'
          // Distinguish 3 failure modes for an honest error message
          if (text.length === 0) {
            u.error = 'No text extracted. PDF is likely scanned/image-only (OCR not yet supported in v1).'
          } else if (text.length < 64) {
            u.error = `Only ${text.length} chars extracted — file has almost no text. Likely image-based.`
          } else {
            // Text was extracted but cleanup left it empty (zero-width / whitespace artifacts only).
            u.error =
              `Extraction returned ${text.length} chars but they are all whitespace / non-text glyphs. ` +
              'PDF likely uses image-based or vector text without a real text layer. OCR upgrade needed.'
          }
          await u.save()
        } else {
          await Chunk.insertMany(
            pieces.map((t, i) => ({
              userId: req.auth.userId,
              sourceType: 'upload',
              sourceId: u._id,
              ix: i,
              text: t,
              charLen: t.length,
            })),
            { ordered: false },
          )
          u.chunkCount = pieces.length
          u.status = 'ready'
          await u.save()
        }
      } catch (err) {
        u.status = 'error'
        u.error = err.message?.slice(0, 500) || 'parse failed'
        await u.save()
      }

      out.push(u.toJSON())
    }

    res.status(201).json({ uploads: out })
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message, code: err.code })
    }
    console.error('[uploads] error:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// GET /api/uploads — list current user's uploads
router.get('/', async (req, res) => {
  try {
    const items = await Upload.find({ userId: req.auth.userId })
      .sort({ createdAt: -1 })
      .limit(200)
    res.json({ uploads: items.map((d) => d.toJSON()) })
  } catch (err) {
    console.error('[uploads] list error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/uploads/:id — remove file + chunks
router.delete('/:id', async (req, res) => {
  try {
    const u = await Upload.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!u) return res.status(404).json({ message: 'Not found' })
    await Chunk.deleteMany({ sourceType: 'upload', sourceId: u._id, userId: req.auth.userId })
    if (u.diskPath) {
      try {
        await fs.unlink(u.diskPath)
      } catch {
        /* file already gone — ignore */
      }
    }
    await u.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    console.error('[uploads] delete error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
