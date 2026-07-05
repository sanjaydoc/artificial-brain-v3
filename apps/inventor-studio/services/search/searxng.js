// SearXNG meta-search adapter. Ported from ASI-1 src/search/searxng.ts.

const SEARXNG_URL = process.env.SEARXNG_BASE_URL || process.env.SEARXNG_URL || 'http://localhost:8080'

async function fetchWithRetry(url, options = {}, timeoutMs = 20_000, retries = 2) {
  let lastErr
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) })
      if (res.status === 429 && attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      return res
    } catch (err) {
      lastErr = err
      if (attempt < retries - 1) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
  throw lastErr
}

export async function webSearch(query, count = 10) {
  try {
    const params = new URLSearchParams({ q: query, format: 'json', pageno: '1' })
    const response = await fetchWithRetry(`${SEARXNG_URL}/search?${params}`)
    if (!response.ok) throw new Error(`SearXNG error: ${response.status}`)
    const data = await response.json()
    return (data?.results || []).slice(0, count).map((r) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.content || '',
      source: r.engine || 'web',
    }))
  } catch (err) {
    console.error('[searxng] web search failed:', err.message)
    return []
  }
}
