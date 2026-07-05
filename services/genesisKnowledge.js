/**
 * Genesis Knowledge — RAG ingestion + retrieval for Genesis agents.
 * Reads folders, chunks text, embeds, stores per-agent knowledge.
 */
import fs from 'fs'
import path from 'path'
import { embed } from './llm.js'
import { GenesisKnowledge } from '../models/GenesisKnowledge.js'

// ── Text Chunker (inline, adapted from businesses/services/chunker.js) ─────

function chunkText(input, opts = {}) {
  const { chunkSize = 1000, overlap = 200 } = opts
  const text = String(input || '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim()
  if (!text) return []

  const paragraphs = text.split(/\n{2,}/)
  const chunks = []
  let current = ''

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length <= chunkSize) {
      current = current ? current + '\n\n' + para : para
    } else {
      if (current) chunks.push(current)
      if (para.length <= chunkSize) {
        current = para
      } else {
        // Split long paragraph by sentences
        const sentences = para.split(/(?<=[.!?])\s+/)
        current = ''
        for (const s of sentences) {
          if ((current + ' ' + s).length <= chunkSize) {
            current = current ? current + ' ' + s : s
          } else {
            if (current) chunks.push(current)
            current = s.length <= chunkSize ? s : s.slice(0, chunkSize)
          }
        }
      }
    }
  }
  if (current) chunks.push(current)

  // Apply overlap
  if (overlap > 0 && chunks.length > 1) {
    const overlapped = [chunks[0]]
    for (let i = 1; i < chunks.length; i++) {
      const prevTail = chunks[i - 1].slice(-overlap)
      overlapped.push(prevTail + '\n' + chunks[i])
    }
    return overlapped
  }

  return chunks
}

// ── File Parsers ──────────────────────────────────────────────────────────

import mammoth from 'mammoth'
import ExcelJS from 'exceljs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const TEXT_EXTS = new Set([
  '.txt', '.md', '.csv', '.json', '.html', '.htm', '.xml',
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs',
  '.css', '.scss', '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.sh', '.bat', '.ps1', '.sql', '.log', '.env',
])

const DOC_EXTS = new Set(['.pdf', '.docx', '.xlsx', '.xls'])

const ALL_SUPPORTED = new Set([...TEXT_EXTS, ...DOC_EXTS])

function isSupportedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return ALL_SUPPORTED.has(ext)
}

async function extractFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.pdf') {
    const buf = fs.readFileSync(filePath)
    const uint8 = new Uint8Array(buf)
    const doc = await getDocument({ data: uint8 }).promise
    const pages = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      pages.push(content.items.map(item => item.str).join(' '))
    }
    return pages.join('\n\n')
  }

  if (ext === '.docx') {
    const out = await mammoth.extractRawText({ path: filePath })
    return out.value || ''
  }

  if (ext === '.xlsx' || ext === '.xls') {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(filePath)
    const lines = []
    wb.eachSheet((sheet) => {
      lines.push(`# Sheet: ${sheet.name}`)
      sheet.eachRow((row) => {
        const vals = []
        row.eachCell({ includeEmpty: false }, (cell) => {
          const v = cell.value
          if (v == null) return
          if (typeof v === 'object' && 'text' in v) vals.push(String(v.text))
          else if (typeof v === 'object' && 'result' in v) vals.push(String(v.result))
          else vals.push(String(v))
        })
        if (vals.length) lines.push(vals.join('\t'))
      })
      lines.push('')
    })
    return lines.join('\n')
  }

  // Plain text files
  return fs.readFileSync(filePath, 'utf8')
}

// ── File Reading ───────────────────────────────────────────────────────────

async function readFolderFiles(folderPath, maxDepth = 3) {
  const files = []
  const SKIP = new Set(['node_modules', '.git', '__pycache__', 'dist', '.next', 'venv'])

  function collectPaths(dir, depth) {
    if (depth > maxDepth || files.length >= 200) return
    let entries
    try { entries = fs.readdirSync(dir) } catch { return }
    for (const name of entries) {
      if (files.length >= 200) return
      if (SKIP.has(name)) continue
      const full = path.join(dir, name)
      let stat
      try { stat = fs.statSync(full) } catch { continue }
      if (stat.isDirectory()) {
        collectPaths(full, depth + 1)
      } else if (stat.isFile() && isSupportedFile(full) && stat.size < 10_000_000) {
        files.push({ path: full, name, size: stat.size })
      }
    }
  }

  collectPaths(folderPath, 0)

  // Extract content from each file (async for PDF/DOCX)
  const results = []
  for (const file of files) {
    try {
      const content = await extractFileContent(file.path)
      if (content?.trim()) results.push({ path: file.path, name: file.name, content })
    } catch { /* skip files that fail to parse */ }
  }
  return results
}

// ── Ingestion ──────────────────────────────────────────────────────────────

/**
 * Ingest a folder into an agent's knowledge base.
 * Reads files → chunks → embeds → stores in GenesisKnowledge.
 * @param {string} agentId
 * @param {string} projectId
 * @param {string} folderPath - Absolute path to folder
 * @param {function} [onProgress] - Optional callback: (event) => void
 * @returns {Promise<{files: number, chunks: number, errors: string[]}>}
 */
export async function ingestFolder(agentId, projectId, folderPath, onProgress) {
  const log = onProgress || (() => {})
  const absPath = path.resolve(folderPath)
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
    throw new Error(`Folder not found: ${absPath}`)
  }

  log({ type: 'status', message: `Scanning folder: ${absPath}` })

  const files = await readFolderFiles(absPath)
  if (files.length === 0) {
    log({ type: 'error', message: 'No readable files found in folder' })
    return { files: 0, chunks: 0, errors: ['No readable files found in folder'] }
  }

  log({ type: 'status', message: `Found ${files.length} file(s) to ingest` })

  // Delete previous knowledge from this folder for this agent (re-ingest)
  await GenesisKnowledge.deleteMany({ agentId, sourcePath: { $regex: `^${escapeRegex(absPath)}` } })
  log({ type: 'status', message: 'Cleared previous knowledge for this folder' })

  const errors = []
  let totalChunks = 0

  for (let f = 0; f < files.length; f++) {
    const file = files[f]
    const chunks = chunkText(file.content, { chunkSize: 800, overlap: 150 })
    log({ type: 'file_start', message: `[${f + 1}/${files.length}] ${file.name} — ${chunks.length} chunks`, fileName: file.name, chunkCount: chunks.length })

    for (let i = 0; i < chunks.length; i++) {
      try {
        const vec = await embed(chunks[i].slice(0, 500))
        await GenesisKnowledge.create({
          agentId,
          projectId,
          sourcePath: file.path,
          fileName: file.name,
          chunkIndex: i,
          content: chunks[i].slice(0, 4000),
          charLen: chunks[i].length,
          embedding: vec,
          embeddingDim: vec.length,
        })
        totalChunks++
        if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
          log({ type: 'chunk_progress', message: `  ${file.name}: ${i + 1}/${chunks.length} chunks embedded`, fileName: file.name, chunk: i + 1, total: chunks.length })
        }
      } catch (err) {
        errors.push(`${file.name} chunk ${i}: ${err.message}`)
        log({ type: 'chunk_error', message: `  Error: ${file.name} chunk ${i}: ${err.message}` })
      }
    }

    log({ type: 'file_done', message: `  ✓ ${file.name} complete (${chunks.length} chunks)`, fileName: file.name })
  }

  // Generate a knowledge summary so the agent knows the full scope
  log({ type: 'status', message: 'Generating knowledge summary...' })
  try {
    await generateKnowledgeSummary(agentId, projectId, files, log)
  } catch (err) {
    log({ type: 'chunk_error', message: `Summary generation failed: ${err.message}` })
  }

  log({ type: 'done', message: `Ingestion complete: ${files.length} files, ${totalChunks} chunks${errors.length ? `, ${errors.length} errors` : ''}`, files: files.length, chunks: totalChunks, errors })
  return { files: files.length, chunks: totalChunks, errors }
}

/**
 * Generate a high-level summary of all ingested content.
 * Stored as a special chunk (chunkIndex: -1) that gets priority in RAG retrieval.
 */
async function generateKnowledgeSummary(agentId, projectId, files, log) {
  // Build a condensed sample from each file (first 2000 chars)
  const samples = files.map(f => `[${f.name}]\n${f.content.slice(0, 2000)}`).join('\n\n---\n\n')
  const truncated = samples.slice(0, 12000)

  const summaryPrompt = `You are analyzing a knowledge base that was just ingested. Based on the sample content below, write a comprehensive summary that covers:
1. What this knowledge base is about (topic, domain)
2. Key entities/items/companies/products mentioned (list as many as you can find)
3. Total estimated count of entries/records if it appears to be a catalog or directory
4. The type of information available (contact details, product specs, pricing, etc.)
5. What kinds of questions this knowledge base can answer

Be thorough — list every entity/company/product name you can identify from the samples.

Content samples:
${truncated}`

  const summary = await chat(
    [{ role: 'user', content: summaryPrompt }],
    { role: 'reasoning', maxTokens: 2000, temperature: 0.3 },
  )

  if (!summary?.trim()) return

  // Delete old summary if exists
  await GenesisKnowledge.deleteMany({ agentId, chunkIndex: -1 })

  // Store summary as a special chunk with high-priority embedding
  const vec = await embed(summary.slice(0, 500))
  await GenesisKnowledge.create({
    agentId,
    projectId,
    sourcePath: '__summary__',
    fileName: '__knowledge_summary__',
    chunkIndex: -1,
    content: summary.slice(0, 6000),
    charLen: summary.length,
    embedding: vec,
    embeddingDim: vec.length,
  })

  log({ type: 'status', message: `Knowledge summary generated (${summary.length} chars)` })
}

// ── Search ─────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Find knowledge chunks most relevant to a query.
 * Two-phase: load only embeddings first (fast), then fetch content for top K.
 * @param {string} agentId
 * @param {string} query
 * @param {number} limit - Top K results
 * @returns {Promise<Array<{content: string, fileName: string, similarity: number}>>}
 */
export async function findRelevant(agentId, query, limit = 5) {
  if (!query?.trim()) return []

  // Always include the knowledge summary if it exists (gives agent the big picture)
  const summary = await GenesisKnowledge.findOne({ agentId, chunkIndex: -1 })
    .select('content fileName sourcePath')
    .lean()

  // Phase 1: embed the query
  let queryVec
  try {
    queryVec = await embed(query.slice(0, 500))
  } catch {
    // If embed fails, still return summary if we have it
    return summary ? [{ content: summary.content, fileName: summary.fileName, sourcePath: summary.sourcePath, similarity: 1.0 }] : []
  }

  // Check if any knowledge exists (exclude summary)
  const count = await GenesisKnowledge.countDocuments({ agentId, chunkIndex: { $gte: 0 } })
  if (count === 0) {
    return summary ? [{ content: summary.content, fileName: summary.fileName, sourcePath: summary.sourcePath, similarity: 1.0 }] : []
  }

  // Phase 2: load ONLY _id + embedding (no content — much smaller payload)
  const chunks = await GenesisKnowledge.find({ agentId, chunkIndex: { $gte: 0 } })
    .select('_id embedding')
    .limit(300)
    .lean()

  // Phase 3: rank by cosine similarity, pick top K
  const ranked = chunks
    .map(c => ({
      _id: c._id,
      similarity: cosineSimilarity(queryVec, c.embedding || []),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .filter(s => s.similarity > 0.1)

  // Phase 4: fetch full content ONLY for top K matches
  const topIds = ranked.map(r => r._id)
  const fullDocs = await GenesisKnowledge.find({ _id: { $in: topIds } })
    .select('content fileName sourcePath')
    .lean()

  const docMap = new Map(fullDocs.map(d => [String(d._id), d]))

  const results = []

  // Always prepend summary first — gives agent the big picture
  if (summary) {
    results.push({ content: summary.content, fileName: '__knowledge_summary__', sourcePath: summary.sourcePath, similarity: 1.0 })
  }

  // Then add the top K relevant chunks
  for (const r of ranked) {
    const doc = docMap.get(String(r._id))
    if (doc) {
      results.push({
        content: doc.content,
        fileName: doc.fileName,
        sourcePath: doc.sourcePath,
        similarity: r.similarity,
      })
    }
  }

  return results
}

/**
 * Get knowledge stats for an agent.
 */
export async function getKnowledgeStats(agentId) {
  const total = await GenesisKnowledge.countDocuments({ agentId })
  const files = await GenesisKnowledge.distinct('sourcePath', { agentId })
  return { totalChunks: total, totalFiles: files.length, files }
}

/**
 * Clear all knowledge for an agent.
 */
export async function clearKnowledge(agentId) {
  const result = await GenesisKnowledge.deleteMany({ agentId })
  return { deleted: result.deletedCount }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
