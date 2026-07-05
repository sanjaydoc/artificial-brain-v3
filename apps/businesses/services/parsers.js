// Extract plain text from common business document formats.
// Each parser receives an absolute disk path and returns a string.

import fs from 'node:fs/promises'
import path from 'node:path'
import mammoth from 'mammoth'
import ExcelJS from 'exceljs'

// pdf-parse's index.js tries to read a sample PDF on first import which crashes
// in production environments. Import the inner module only when actually needed.
let _pdfParse = null
async function getPdfParse() {
  if (!_pdfParse) {
    const mod = await import('pdf-parse/lib/pdf-parse.js')
    _pdfParse = mod.default || mod
  }
  return _pdfParse
}

const DECODER = new TextDecoder('utf-8')

/** Decide which parser to use based on mimetype + extension. */
export function detectKind(mimeType, fileName) {
  const ext = path.extname(fileName || '').toLowerCase()
  if (mimeType === 'application/pdf' || ext === '.pdf') return 'pdf'
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  )
    return 'docx'
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    ext === '.xlsx' ||
    ext === '.xls'
  )
    return 'xlsx'
  if (mimeType === 'text/csv' || ext === '.csv') return 'csv'
  if (mimeType === 'text/markdown' || ext === '.md' || ext === '.markdown') return 'md'
  if (
    mimeType?.startsWith('text/') ||
    ext === '.txt' ||
    ext === '.json' ||
    ext === '.html' ||
    ext === '.htm'
  )
    return 'text'
  return 'unsupported'
}

async function parsePdf(diskPath) {
  const pdfParse = await getPdfParse()
  const buf = await fs.readFile(diskPath)
  const out = await pdfParse(buf)
  return out.text || ''
}

async function parseDocx(diskPath) {
  const out = await mammoth.extractRawText({ path: diskPath })
  return out.value || ''
}

async function parseXlsx(diskPath) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(diskPath)
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

async function parseTextLike(diskPath) {
  const buf = await fs.readFile(diskPath)
  return DECODER.decode(buf)
}

/**
 * Returns { text, kind } for an uploaded file.
 * Throws { code: 'UNSUPPORTED' } for formats we don't parse.
 */
export async function extractText({ diskPath, mimeType, fileName }) {
  const kind = detectKind(mimeType, fileName)
  switch (kind) {
    case 'pdf':
      return { text: await parsePdf(diskPath), kind }
    case 'docx':
      return { text: await parseDocx(diskPath), kind }
    case 'xlsx':
      return { text: await parseXlsx(diskPath), kind }
    case 'csv':
    case 'md':
    case 'text':
      return { text: await parseTextLike(diskPath), kind }
    default: {
      const err = new Error(`Unsupported file type: ${mimeType || fileName}`)
      err.code = 'UNSUPPORTED'
      throw err
    }
  }
}
