// GitHub repo search. Ported from ASI-1 src/search/github.ts.

async function fetchGitHubSearch(params, withToken) {
  const headers = { Accept: 'application/vnd.github.v3+json' }
  if (withToken && process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return fetch(`https://api.github.com/search/repositories?${params}`, {
    headers,
    signal: AbortSignal.timeout(8_000),
  })
}

export async function searchGitHub(query, maxResults = 5) {
  try {
    const shortQuery = query.replace(/[^\w\s-]/g, ' ').trim().slice(0, 80)
    const params = new URLSearchParams({
      q: shortQuery,
      sort: 'stars',
      order: 'desc',
      per_page: String(maxResults),
    })

    let response = await fetchGitHubSearch(params, true)
    if (response.status === 401) response = await fetchGitHubSearch(params, false)
    if (!response.ok) throw new Error(`GitHub error: ${response.status}`)

    const data = await response.json()
    return (data.items || []).map((r) => ({
      name: r.name || '',
      fullName: r.full_name || '',
      description: r.description || '',
      url: r.html_url || '',
      stars: r.stargazers_count || 0,
      language: r.language || '',
      topics: r.topics || [],
    }))
  } catch (err) {
    console.error('[github] search failed:', err.message)
    return []
  }
}
