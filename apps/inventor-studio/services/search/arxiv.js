// ArXiv search adapter. Ported from ASI-1 src/search/arxiv.ts.

import { parseStringPromise } from 'xml2js'

const ARXIV_URL = 'https://export.arxiv.org/api/query'

export async function searchArxiv(query, maxResults = 5) {
  try {
    const params = new URLSearchParams({
      search_query: `all:${query}`,
      start: '0',
      max_results: String(maxResults),
      sortBy: 'relevance',
      sortOrder: 'descending',
    })
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6_000)
    const response = await fetch(`${ARXIV_URL}?${params}`, { signal: controller.signal })
    clearTimeout(timer)
    if (!response.ok) throw new Error(`ArXiv error: ${response.status}`)
    const xml = await response.text()
    const parsed = await parseStringPromise(xml)
    const entries = parsed.feed?.entry || []
    return entries.map((e) => ({
      title: (e.title?.[0] || '').trim(),
      authors: (e.author || []).map((a) => a.name?.[0] || ''),
      summary: (e.summary?.[0] || '').trim(),
      url: (e.id?.[0] || '').trim(),
      published: (e.published?.[0] || '').trim(),
      categories: (e.category || []).map((c) => c.$?.term || ''),
    }))
  } catch (err) {
    console.warn('[arxiv] skipped:', err.message?.slice(0, 80))
    return []
  }
}
