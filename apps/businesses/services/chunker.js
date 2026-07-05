// Recursive text splitter — paragraph → sentence → fixed-size fallback.
// Default: 1000-char chunks with 200-char overlap. No external dep.

const DEFAULT_OPTS = { chunkSize: 1000, overlap: 200 }

const SENTENCE_BREAKS = /(?<=[.!?])\s+(?=[A-Z0-9])/g
const PARA_BREAKS = /\n{2,}/

function clean(s) {
  return String(s)
    .replace(/\r\n?/g, '\n')
    .replace(/[​ ﻿]/g, ' ') // zero-width / NBSP / BOM → space
    .trim()
}

function fixedSplit(s, size, overlap) {
  const out = []
  let i = 0
  while (i < s.length) {
    const end = Math.min(i + size, s.length)
    out.push(s.slice(i, end))
    if (end === s.length) break
    i = end - overlap
    if (i < 0) i = 0
  }
  return out
}

function packPieces(pieces, size, overlap) {
  const chunks = []
  let buf = ''
  for (const piece of pieces) {
    if (!piece) continue
    if (buf.length + piece.length + 1 <= size) {
      buf = buf ? buf + ' ' + piece : piece
      continue
    }
    if (buf) chunks.push(buf)
    if (piece.length > size) {
      // piece itself too big — fall through to fixed split with overlap
      chunks.push(...fixedSplit(piece, size, overlap))
      buf = ''
      continue
    }
    // begin new buffer with overlap from previous chunk's tail (if any)
    const prev = chunks[chunks.length - 1] || ''
    const tail = prev.slice(-overlap)
    buf = tail ? tail + ' ' + piece : piece
  }
  if (buf) chunks.push(buf)
  return chunks
}

/**
 * Split a long text into chunks of ~chunkSize chars with overlap.
 * Returns string[] (may be empty if input is empty).
 */
export function chunkText(input, opts = {}) {
  const { chunkSize, overlap } = { ...DEFAULT_OPTS, ...opts }
  const text = clean(input)
  if (!text) return []
  if (text.length <= chunkSize) return [text]

  // First pass: split by paragraphs.
  const paras = text.split(PARA_BREAKS).map((p) => p.trim()).filter(Boolean)
  // If any paragraph is longer than chunkSize, sentence-split it further.
  const pieces = []
  for (const p of paras) {
    if (p.length <= chunkSize) {
      pieces.push(p)
      continue
    }
    const sentences = p.split(SENTENCE_BREAKS).map((s) => s.trim()).filter(Boolean)
    for (const s of sentences) {
      if (s.length <= chunkSize) pieces.push(s)
      else pieces.push(...fixedSplit(s, chunkSize, overlap))
    }
  }
  return packPieces(pieces, chunkSize, overlap)
}
