// Main dream pipeline. Ported from ASI-1 src/dreamLoop.ts.
// Orchestrates: parallel search → dream agents → synthesize → critique →
// MVP build guide → store + emit progress events. Mongoose-backed.

import { ALL_AGENTS } from './agents/dreamAgents.js'
import { synthesize } from './agents/synthesizer.js'
import { generateMVP, generateCoreSpecAndCritique } from './agents/mvpGenerator.js'
import { generateCanvas } from './agents/canvasGenerator.js'
import { webSearch } from './search/searxng.js'
import { searchArxiv } from './search/arxiv.js'
import { searchPubMed } from './search/pubmed.js'
import { searchPatents } from './search/uspto.js'
import { searchGitHub } from './search/github.js'
import { searchPubChem } from './search/pubchem.js'
import { readPage } from './search/jina.js'
import { storeKnowledge, findSimilar } from './memory/vectorStore.js'
import {
  addNode,
  addEdge,
  findOrCreateNode,
  buildGraphContext,
  linkToSimilar,
} from './memory/knowledgeGraph.js'
import { domainALS } from './utils/domainContext.js'
import { getEnabledAgents } from './utils/agentConfig.js'
import { getTimingMode } from './utils/timingMode.js'

import { Invention } from '../models/Invention.js'
import { DreamOutput } from '../models/DreamOutput.js'
import { CriticFeedback } from '../models/CriticFeedback.js'
import { InventionSource } from '../models/InventionSource.js'
import { StreamEvent } from '../models/StreamEvent.js'

// ── Default no-op stream emitter ──────────────────────────────────────────
const noopEmitter = {
  emit(_inventionId, _type, _payload) {},
}

// Score a snippet by keyword overlap with query.
function relevanceScore(text, query) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  if (words.length === 0) return 0
  const t = String(text || '').toLowerCase()
  return words.filter((w) => t.includes(w)).length / words.length
}

async function emit(emitter, inventionId, eventType, payload) {
  try {
    emitter?.emit?.(inventionId, eventType, payload)
    await StreamEvent.create({ inventionId, eventType, payload }).catch(() => {})
  } catch {}
}

async function setStatus(inventionId, status) {
  try { await Invention.updateOne({ _id: inventionId }, { $set: { status } }) } catch {}
}

// Heuristic emotional context (port-stub of selfAwareness.buildEmotionalContext)
function buildEmotionalContext(state) {
  if (!state) return ''
  const { curiosity = 0.5, frustration = 0, satisfaction = 0.5, excitement = 0.5 } = state
  const lines = ['[ASI Emotional State — let this shape your invention]']
  if (frustration > 0.65) lines.push(`- Frustration HIGH (${(frustration * 100).toFixed(0)}%) — focus on ONE core mechanism, strip complexity.`)
  else if (curiosity > 0.7) lines.push(`- Curiosity HIGH (${(curiosity * 100).toFixed(0)}%) — explore radical, cross-domain territory.`)
  else if (excitement > 0.7) lines.push(`- Excitement HIGH (${(excitement * 100).toFixed(0)}%) — be ambitious, fuse domains.`)
  else if (satisfaction > 0.7) lines.push(`- Satisfaction HIGH — deepen recent successes rather than pivot.`)
  else lines.push('- Emotional state balanced — novelty and feasibility equally weighted.')
  return lines.join('\n')
}

export async function runDreamLoop(opts) {
  const {
    inventionId,
    concept,
    emitter = noopEmitter,
    domain = 'hybrid',
    consciousnessState = null,
    agentCount = 10,
  } = opts

  // Cell-therapy pipeline branch — port stub.
  if (domain === 'cell-therapy') {
    try {
      const { runCellTherapyPipeline } = await import('./cellTherapy.js')
      const ctSpec = await runCellTherapyPipeline(inventionId, concept, emitter)
      if (ctSpec) {
        await Invention.updateOne(
          { _id: inventionId },
          {
            $set: {
              status: 'complete',
              title: String(ctSpec.title || '').slice(0, 490),
              domain: 'cell-therapy',
              noveltyScore: ctSpec.noveltyScore,
              feasibilityScore: ctSpec.feasibilityScore,
              impactScore: ctSpec.impactScore,
              inventionSpec: ctSpec,
              cycleCount: 1,
            },
          },
        )
        await emit(emitter, inventionId, 'complete', { mvpSpec: ctSpec })
        await emit(emitter, inventionId, 'canvas', { canvas: null })
      } else {
        await setStatus(inventionId, 'failed')
        await emit(emitter, inventionId, 'error', { message: 'Cell therapy pipeline failed' })
      }
      return ctSpec
    } catch (err) {
      console.error('[dreamLoop] cell-therapy branch failed:', err.message)
      await setStatus(inventionId, 'failed')
      return null
    }
  }

  return domainALS.run({ domain }, () => _runStandardDreamLoop({ ...opts, domain, emitter, consciousnessState }))
}

async function _runStandardDreamLoop({ inventionId, concept, emitter, consciousnessState, agentCount = 10 }) {
  const T = { mode: getTimingMode(), search_ms: 0, jina_ms: 0, agents_ms: 0, per_agent: {}, synthesizer_ms: 0, critique_ms: 0, build_ms: 0, total_ms: 0 }
  const loopStart = Date.now()

  try {
    await setStatus(inventionId, 'searching')
    await emit(emitter, inventionId, 'status', { phase: 'searching', message: 'Searching knowledge sources...' })

    const _t2 = Date.now()
    const settled = await Promise.allSettled([
      webSearch(concept, 5),
      searchArxiv(concept, 3),
      searchPubMed(concept, 3),
      searchPatents(concept, 3),
      searchGitHub(concept, 3),
      findSimilar(concept, 5),
      searchPubChem(concept, 3),
    ])
    const [web, arxiv, pubmed, patents, github, memory, pubchem] = settled.map((s) => (s.status === 'fulfilled' ? s.value : []))
    T.search_ms = Date.now() - _t2

    await emit(emitter, inventionId, 'search_complete', {
      webCount: web.length,
      arxivCount: arxiv.length,
      pubmedCount: pubmed.length,
      patentCount: patents.length,
      githubCount: github.length,
      memoryCount: memory.length,
      pubchemCount: pubchem.length,
    })

    let pageContent = ''
    const topWebUrl = web[0]?.url
    if (topWebUrl) {
      const _t3 = Date.now()
      pageContent = await readPage(topWebUrl)
      T.jina_ms = Date.now() - _t3
    }

    const scoredArxiv = arxiv.map((a) => ({ ...a, _score: relevanceScore(`${a.title} ${a.summary || ''}`, concept) })).sort((a, b) => b._score - a._score)
    const scoredWeb = web.map((w) => ({ ...w, _score: relevanceScore(`${w.title} ${w.snippet || ''}`, concept) })).sort((a, b) => b._score - a._score)
    const scoredPubmed = pubmed.map((p) => ({ ...p, _score: relevanceScore(p.title, concept) })).sort((a, b) => b._score - a._score)

    const graphContext = await buildGraphContext(concept, 5)
    const emotionalContext = buildEmotionalContext(consciousnessState)

    const context = [
      emotionalContext,
      graphContext,
      memory.slice(0, 3).map((m) => m.content).join('\n'),
      scoredArxiv.slice(0, 3).map((a) => `[ArXiv] ${a.title}: ${a.summary?.slice(0, 400) || ''}`).join('\n'),
      scoredPubmed.slice(0, 2).map((p) => `[PubMed] ${p.title}`).join('\n'),
      patents.slice(0, 2).map((p) => `[Patent] ${p.title}`).join('\n'),
      scoredWeb.slice(0, 3).map((w) => `[Web] ${w.title}: ${w.snippet || ''}`).join('\n'),
      pubchem.slice(0, 2).map((c) => `[PubChem] ${c.name} (${c.formula}, MW:${c.molecularWeight})`).join('\n'),
      pageContent ? `[Full Page]\n${pageContent}` : '',
    ].filter(Boolean).join('\n\n').slice(0, 6000)

    // Phase: Dream agents
    await setStatus(inventionId, 'dreaming')
    const enabled = new Set(getEnabledAgents())
    const agentFns = Object.entries(ALL_AGENTS).filter(([name]) => enabled.has(name)).map(([name, fn]) => ({ name, fn })).slice(0, agentCount)
    await emit(emitter, inventionId, 'status', { phase: 'dreaming', message: `Dream agents awakening... (${agentFns.length} active)` })

    const dreamOutputs = {}
    const _t5 = Date.now()
    for (const { name, fn } of agentFns) {
      const _ta = Date.now()
      try {
        await emit(emitter, inventionId, 'agent_start', { lens: name })
        const output = await fn(concept, context)
        T.per_agent[name] = Date.now() - _ta
        dreamOutputs[name] = output
        await emit(emitter, inventionId, 'agent_output', { lens: name, output })
        await DreamOutput.create({ inventionId, agentLens: name, output }).catch(() => {})
      } catch (err) {
        T.per_agent[name] = Date.now() - _ta
        console.error(`[dreamLoop] agent ${name} failed:`, err.message)
        await emit(emitter, inventionId, 'agent_output', { lens: name, output: `[${name} agent failed]` })
      }
    }
    T.agents_ms = Date.now() - _t5

    // Phase: synthesize
    await setStatus(inventionId, 'synthesizing')
    await emit(emitter, inventionId, 'status', { phase: 'synthesizing', message: 'Synthesizing dream outputs...' })
    const _t6 = Date.now()
    const synthesis = await synthesize(concept, dreamOutputs)
    T.synthesizer_ms = Date.now() - _t6
    await emit(emitter, inventionId, 'synthesis', synthesis)

    const topInvention = synthesis.topInventions[0]
    const priorArtStrings = patents.map((p) => `${p.title} (US${p.patentNumber})`)

    // Phase: critique + core spec
    await setStatus(inventionId, 'critiquing')
    await emit(emitter, inventionId, 'status', { phase: 'critiquing', message: 'Critic + MVP agent running...' })
    const _t7a = Date.now()
    const { core, criticResult } = await generateCoreSpecAndCritique(topInvention.title, topInvention.concept, priorArtStrings)
    T.critique_ms = Date.now() - _t7a
    await emit(emitter, inventionId, 'critique', criticResult)
    await CriticFeedback.create({
      inventionId,
      challenge: (criticResult.challenges || []).join('; '),
      verdict: criticResult.verdict,
      reason: criticResult.reason,
    }).catch(() => {})

    // Phase: MVP build guide
    await emit(emitter, inventionId, 'status', { phase: 'generating_mvp', message: 'Generating build guide...' })
    const _t7b = Date.now()
    const mvpSpec = await generateMVP(topInvention.title, topInvention.concept, core)
    T.build_ms = Date.now() - _t7b

    T.total_ms = Date.now() - loopStart
    await Invention.updateOne(
      { _id: inventionId },
      {
        $set: {
          status: 'complete',
          title: String(mvpSpec.title || '').slice(0, 490),
          domain: (mvpSpec.domain || 'hybrid').slice(0, 45),
          noveltyScore: mvpSpec.noveltyScore,
          feasibilityScore: mvpSpec.feasibilityScore,
          impactScore: mvpSpec.impactScore,
          inventionSpec: { ...mvpSpec, _timing: T },
          // Persist pipeline outputs so InventionDetail can render them later
          // without separate collection lookups.
          agents: dreamOutputs,
          synthesis,
          critique: criticResult,
        },
        $inc: { cycleCount: 1 },
      },
    )
    await emit(emitter, inventionId, 'complete', { mvpSpec })

    // Background: persist sources + memory + KG
    setImmediate(async () => {
      try {
        for (const src of [...arxiv.slice(0, 3), ...web.slice(0, 3)]) {
          await InventionSource.create({
            inventionId,
            title: src.title,
            url: src.url,
            sourceType: 'search',
          }).catch(() => {})
        }

        await storeKnowledge(`${mvpSpec.title}: ${mvpSpec.concept}`, `invention:${inventionId}`, 'invention', mvpSpec.domain, `https://inventor-studio/invention/${inventionId}`)

        const inventionNodeId = await addNode(
          mvpSpec.title,
          'invention',
          mvpSpec.concept || '',
          mvpSpec.domain,
          `invention:${inventionId}`,
          mvpSpec.noveltyScore || 0,
          { inventionId: String(inventionId), feasibilityScore: mvpSpec.feasibilityScore, impactScore: mvpSpec.impactScore },
        )

        for (const conn of (mvpSpec.crossDomainConnections || []).slice(0, 5)) {
          const cid = await findOrCreateNode(String(conn).slice(0, 499), 'concept', conn, mvpSpec.domain, `synthesis:${inventionId}`, 0.5)
          if (inventionNodeId && cid) await addEdge(cid, inventionNodeId, 'INSPIRED_BY', 0.7, 'cross-domain synthesis')
        }
        for (const paper of scoredArxiv.slice(0, 3)) {
          const pid = await findOrCreateNode(paper.title, 'paper', paper.summary?.slice(0, 500) || paper.title, mvpSpec.domain, paper.url || '', 0)
          if (inventionNodeId && pid) await addEdge(pid, inventionNodeId, 'INSPIRED_BY', 0.6, 'arxiv research')
        }
        for (const wr of scoredWeb.slice(0, 3)) {
          if (!wr.snippet && !wr.title) continue
          const wid = await findOrCreateNode(wr.title, 'concept', (wr.snippet || '').slice(0, 500) || wr.title, mvpSpec.domain, wr.url || 'web', 0)
          if (inventionNodeId && wid) await addEdge(wid, inventionNodeId, 'INSPIRED_BY', 0.5, 'web research')
        }
        for (const [lens, output] of Object.entries(dreamOutputs)) {
          const lensLabel = `${lens} -> ${String(mvpSpec.title).slice(0, 80)}`
          const lid = await findOrCreateNode(lensLabel, 'agent_output', String(output).slice(0, 500), mvpSpec.domain, `agent:${lens}`, 0)
          if (inventionNodeId && lid) await addEdge(lid, inventionNodeId, 'DISCOVERED_BY', 0.8, `${lens} dream agent`)
        }
        if (inventionNodeId && mvpSpec.concept) await linkToSimilar(inventionNodeId, mvpSpec.concept, 'SIMILAR_TO', 3, 0.72)
      } catch (err) {
        console.warn('[dreamLoop] background memory store failed:', err.message)
      }
    })

    // Background: prototype canvas
    setImmediate(async () => {
      try {
        await emit(emitter, inventionId, 'status', { phase: 'generating_canvas', message: 'Building prototype layout...' })
        const canvas = await generateCanvas(mvpSpec.title, mvpSpec.domain, mvpSpec.concept, mvpSpec.components || []).catch(() => null)
        if (canvas) {
          await Invention.updateOne(
            { _id: inventionId },
            { $set: { 'inventionSpec.prototypeCanvas': canvas } },
          )
        }
        await emit(emitter, inventionId, 'canvas', { canvas })
      } catch (err) {
        await emit(emitter, inventionId, 'canvas', { canvas: null })
      }
    })

    return mvpSpec
  } catch (err) {
    console.error('[dreamLoop] error:', err)
    await setStatus(inventionId, 'failed')
    await emit(emitter, inventionId, 'error', { message: String(err.message || err) })
    return null
  }
}
