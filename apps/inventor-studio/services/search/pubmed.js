// PubMed (NCBI eutils) search. Ported from ASI-1 src/search/pubmed.ts.

async function fetchWithRetry(url, opts = {}, timeoutMs = 8_000) {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) })
}

export async function searchPubMed(query, maxResults = 5) {
  try {
    const searchParams = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmax: String(maxResults),
      retmode: 'json',
      sort: 'relevance',
      ...(process.env.NCBI_API_KEY && { api_key: process.env.NCBI_API_KEY }),
    })
    const searchRes = await fetchWithRetry(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams}`)
    if (!searchRes.ok) throw new Error(`PubMed search error: ${searchRes.status}`)
    const searchData = await searchRes.json()
    const ids = searchData.esearchresult?.idlist || []
    if (ids.length === 0) return []

    const fetchParams = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
      ...(process.env.NCBI_API_KEY && { api_key: process.env.NCBI_API_KEY }),
    })
    const fetchRes = await fetchWithRetry(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${fetchParams}`)
    if (!fetchRes.ok) throw new Error(`PubMed fetch error: ${fetchRes.status}`)
    const fetchData = await fetchRes.json()
    const result = fetchData.result || {}

    return ids.map((id) => {
      const article = result[id] || {}
      return {
        title: article.title || '',
        abstract: '',
        authors: (article.authors || []).map((a) => a.name || ''),
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        pmid: id,
        publishedDate: article.sortpubdate || '',
      }
    })
  } catch (err) {
    console.warn('[pubmed] skipped:', err.message?.slice(0, 80))
    return []
  }
}
