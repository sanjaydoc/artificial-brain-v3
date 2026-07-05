// Components agent — for each build-guide step, classify it and search the web
// for software packages / hardware items / data resources. Ported from ASI-1
// src/agents/componentsAgent.ts. Image base64-fetching dropped to keep payloads
// small; only image URLs are returned.

import { reasoningLLM } from '../utils/llmAdapter.js'
import { extractJson } from '../utils/parseJson.js'

const SEARXNG_URL =
  process.env.SEARXNG_BASE_URL || process.env.SEARXNG_URL || 'http://localhost:11436/searxng'

// When Searxng is behind the inventor-studio-llm Caddy gate, every request
// must include X-Auth-Token. Falls back to the tunnel auth token if no
// dedicated SEARXNG token is set (single-token deployment).
const SEARXNG_AUTH =
  process.env.SEARXNG_AUTH_TOKEN || process.env.OLLAMA_TUNNEL_AUTH_TOKEN || ''

async function searchSearxng(query, category = 'general') {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      pageno: '1',
      ...(category === 'images' ? { categories: 'images' } : {}),
    })
    const res = await fetch(`${SEARXNG_URL}/search?${params}`, {
      headers: SEARXNG_AUTH ? { 'X-Auth-Token': SEARXNG_AUTH } : {},
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data?.results || []).slice(0, 5)
  } catch {
    return []
  }
}

function guessEcosystem(url, hint = '') {
  if (url.includes('pypi.org') || hint === 'pip') return 'pip'
  if (url.includes('npmjs.com') || hint === 'npm') return 'npm'
  if (url.includes('anaconda.org') || hint === 'conda') return 'conda'
  if (url.includes('packages.ubuntu') || hint === 'apt') return 'apt'
  if (url.includes('brew.sh') || hint === 'brew') return 'brew'
  return 'other'
}

function extractPackageName(url, title, ecosystem) {
  if (ecosystem === 'pip' && url.includes('pypi.org/project/')) {
    return url.split('/project/')[1]?.replace(/\/$/, '').split('/')[0] || ''
  }
  if (ecosystem === 'npm' && url.includes('npmjs.com/package/')) {
    return url.split('/package/')[1]?.replace(/\/$/, '').split('/')[0] || ''
  }
  if (ecosystem === 'conda' && url.includes('anaconda.org/')) {
    const parts = url.split('anaconda.org/')[1]?.split('/')
    return parts?.[1] || parts?.[0] || ''
  }
  return title.split(' - ')[0].split(' | ')[0].split(' · ')[0].trim().toLowerCase().replace(/\s+/g, '-')
}

function buildInstallCmd(name, ecosystem) {
  switch (ecosystem) {
    case 'pip': return `pip install ${name}`
    case 'npm': return `npm install ${name}`
    case 'conda': return `conda install -c conda-forge ${name}`
    case 'apt': return `sudo apt-get install -y ${name}`
    case 'brew': return `brew install ${name}`
    default: return `# Install ${name}`
  }
}

function guessResourceType(url) {
  if (url.includes('huggingface.co') && url.includes('/models')) return 'model'
  if (url.includes('huggingface.co')) return 'model'
  if (url.includes('kaggle.com')) return 'dataset'
  if (url.includes('github.com')) return 'tool'
  return 'dataset'
}

function buildDownloadCmd(url) {
  if (url.includes('huggingface.co/')) {
    const slug = url.split('huggingface.co/')[1]?.split('?')[0].replace(/\/$/, '')
    return slug ? `huggingface-cli download ${slug}` : ''
  }
  if (url.includes('kaggle.com/datasets/')) {
    const slug = url.split('kaggle.com/datasets/')[1]?.split('?')[0].replace(/\/$/, '')
    return slug ? `kaggle datasets download -d ${slug}` : ''
  }
  return `wget "${url}"`
}

function amazonBuyLink(query) {
  return `https://www.amazon.in/s?k=${encodeURIComponent(query)}`
}

async function buildSoftwareStep(stepText, query, ecosystemHint) {
  const results = await searchSearxng(query + ' package install')
  const packages = []
  const commands = []
  for (const r of results.slice(0, 3)) {
    const eco = guessEcosystem(r.url, ecosystemHint)
    const name = extractPackageName(r.url, r.title, eco)
    if (!name) continue
    const installCmd = buildInstallCmd(name, eco)
    packages.push({ name, ecosystem: eco, installCmd, link: r.url, description: (r.content || r.title).slice(0, 120) })
    commands.push(installCmd)
  }
  return { stepText, type: 'software', commands, packages }
}

async function buildHardwareStep(stepText, query) {
  const [webResults, imageResults] = await Promise.all([
    searchSearxng(query + ' buy specifications'),
    searchSearxng(query, 'images'),
  ])

  const hardware = webResults.slice(0, 2).map((r, idx) => {
    const name = r.title.split(' - ')[0].split(' | ')[0].trim()
    const imageUrl = imageResults[idx]?.img_src || imageResults[0]?.img_src || ''
    return {
      name,
      specs: (r.content || '').slice(0, 180),
      priceRange: '',
      buyLink: r.url || amazonBuyLink(query),
      imageUrl,
    }
  })

  return { stepText, type: 'hardware', hardware }
}

async function buildDataStep(stepText, query) {
  const results = await searchSearxng(query + ' dataset download')
  const resources = results.slice(0, 2).map((r) => {
    const name = r.title.split(' - ')[0].split(' · ')[0].trim()
    return {
      name,
      type: guessResourceType(r.url),
      link: r.url,
      downloadCmd: buildDownloadCmd(r.url),
      description: (r.content || r.title).slice(0, 120),
    }
  })
  return { stepText, type: 'data', resources }
}

async function enrichPhase(inventionTitle, domain, phase) {
  const stepsText = phase.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')

  const prompt = `You are a prototype engineer. For each build step of "${inventionTitle}" (${domain}), determine what component is needed and write the best search query to find it online.

STEPS:
${stepsText}

Rules:
- "software": searchQuery = exact tool/package name + language
- "hardware": searchQuery = specific component to purchase
- "data": searchQuery = dataset/model name + source
- "process": planning/paperwork/testing — searchQuery = ""

Output ONLY raw JSON:
{"steps":[{"stepText":"<exact step text>","type":"hardware","searchQuery":"...","ecosystem":""}]}`

  const llmText = await reasoningLLM.invokeJson(prompt, 1200)
  const parsed = extractJson(llmText)

  const analyses = parsed?.steps?.length
    ? parsed.steps.map((s, i) => ({ ...s, stepText: s.stepText || phase.steps[i] || '' }))
    : phase.steps.map((s) => ({ stepText: s, type: 'process', searchQuery: '' }))

  const enrichedSteps = []
  for (const analysis of analyses) {
    const stepText = analysis.stepText
    const query = analysis.searchQuery?.trim()
    if (analysis.type === 'process' || !query) {
      enrichedSteps.push({ stepText, type: 'process' })
      continue
    }
    try {
      if (analysis.type === 'software') {
        enrichedSteps.push(await buildSoftwareStep(stepText, query, analysis.ecosystem || ''))
      } else if (analysis.type === 'hardware') {
        enrichedSteps.push(await buildHardwareStep(stepText, query))
      } else if (analysis.type === 'data') {
        enrichedSteps.push(await buildDataStep(stepText, query))
      } else {
        enrichedSteps.push({ stepText, type: 'process' })
      }
    } catch (err) {
      console.error(`[componentsAgent] search failed:`, err.message)
      enrichedSteps.push({ stepText, type: 'process' })
    }
  }

  return { phase: phase.phase, duration: phase.duration, steps: phase.steps, enrichedSteps }
}

export async function getComponents(inventionTitle, domain, buildGuide) {
  const enriched = []
  for (const phase of buildGuide || []) {
    try {
      enriched.push(await enrichPhase(inventionTitle, domain, phase))
    } catch (err) {
      console.error('[componentsAgent] phase failed:', err.message)
      enriched.push({
        ...phase,
        enrichedSteps: phase.steps.map((s) => ({ stepText: s, type: 'process' })),
      })
    }
  }
  return enriched
}
