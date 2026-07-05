// USPTO PatentsView search. Ported from ASI-1 src/search/uspto.ts.

export async function searchPatents(query, maxResults = 5) {
  try {
    const params = new URLSearchParams({
      q: `{"_query_string":{"query":"${query}"}}`,
      f: '["patent_title","patent_number","inventor_first_name","inventor_last_name","patent_abstract","patent_date"]',
      o: `{"per_page":${maxResults}}`,
    })
    const response = await fetch(`https://search.patentsview.org/api/v1/patent/?${params}`, { signal: AbortSignal.timeout(8_000) })
    if (!response.ok) throw new Error(`USPTO error: ${response.status}`)
    const data = await response.json()
    return (data.patents || []).map((p) => ({
      title: p.patent_title || '',
      patentNumber: p.patent_number || '',
      inventors: (p.inventors || []).map((i) => `${i.inventor_first_name} ${i.inventor_last_name}`),
      abstract: p.patent_abstract || '',
      url: `https://patents.google.com/patent/US${p.patent_number}`,
      filingDate: p.patent_date || '',
    }))
  } catch {
    return []
  }
}
