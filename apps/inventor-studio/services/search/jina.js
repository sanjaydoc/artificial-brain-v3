// Jina Reader — fetch the readable text of a URL. Ported from ASI-1 jina.ts.

import axios from 'axios'

export async function readPage(url) {
  try {
    const { data } = await axios.get(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/plain' },
      timeout: 8_000,
      responseType: 'text',
    })
    return (data ?? '').slice(0, 1500)
  } catch {
    return ''
  }
}
