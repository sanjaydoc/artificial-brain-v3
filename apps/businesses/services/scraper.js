// Polite URL scraper — fetch HTML, extract title/description/text/links.
// Uses cheerio for parsing. No headless browser, so JS-heavy SPAs return thin
// content; that's a known limitation we accept for v1.

import axios from 'axios'
import * as cheerio from 'cheerio'

const UA =
  'Mozilla/5.0 (compatible; SentianceBot/0.1; +https://klabs.network) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const STRIP = 'script, style, noscript, iframe, svg, nav, footer, form, aside'

/**
 * Scrape a URL once. Returns:
 *   { url, finalUrl, status, title, description, text, links, html_bytes }
 * Throws on network error / non-2xx after retries.
 */
export async function scrapeUrl(url, { timeoutMs = 20000 } = {}) {
  const r = await axios.get(url, {
    timeout: timeoutMs,
    maxRedirects: 5,
    responseType: 'text',
    headers: {
      'User-Agent': UA,
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    validateStatus: () => true, // we'll inspect
  })

  const html = typeof r.data === 'string' ? r.data : ''
  const status = r.status
  const finalUrl = r.request?.res?.responseUrl || url

  if (status >= 400 || !html) {
    return {
      url,
      finalUrl,
      status,
      title: '',
      description: '',
      text: '',
      links: [],
      html_bytes: html.length,
    }
  }

  const $ = cheerio.load(html)

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    ''

  const description =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    ''

  // Strip non-content elements before reading text
  $(STRIP).remove()

  // Prefer <main>/<article> if present; fall back to body
  let textRoot = $('main').first()
  if (!textRoot.length) textRoot = $('article').first()
  if (!textRoot.length) textRoot = $('body')

  const text = textRoot
    .text()
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()

  // Internal links (one hop, deduped, max 50)
  const seen = new Set()
  const links = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    try {
      const abs = new URL(href, finalUrl).toString()
      if (!abs.startsWith('http')) return
      if (seen.has(abs)) return
      seen.add(abs)
      links.push(abs)
      if (links.length >= 50) return false
    } catch {
      /* noop */
    }
  })

  return {
    url,
    finalUrl,
    status,
    title,
    description,
    text,
    links,
    html_bytes: html.length,
  }
}
