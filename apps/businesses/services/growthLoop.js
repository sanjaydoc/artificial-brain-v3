// Growth-loop orchestrator.
// Pipeline: gather context → 10 agents (sequential) → synthesize → critique → plan
// Streams events as it runs; persists final result on the Growth document.

import { EventEmitter } from 'node:events'
import { Growth } from '../models/Growth.js'
import { Chunk } from '../models/Chunk.js'
import { Upload } from '../models/Upload.js'
import { Scrape } from '../models/Scrape.js'
import { User } from '../models/User.js'
import { SubscriptionSettings } from '../models/SubscriptionSettings.js'
import { ALL_AGENTS, AGENT_NAMES } from './agents.js'
import { getEnabledAgents } from './agentConfig.js'
import { chat } from './llm.js'

/** No-op — plan limits disabled in businesses app. */
export async function assertWithinPlanLimit(_userId) {
  // No limits
}

/** No-op — usage tracking disabled. */
export async function incrementUsage(_userId) {
  // No-op
}

// In-memory event bus, per growthId — used by SSE handlers.
// Survives only within this Node process (cPanel restart drops state, ok for v1).
const buses = new Map() // growthId(string) → EventEmitter
const replays = new Map() // growthId → array of events (for late subscribers)

const MAX_REPLAY_PER_LOOP = 200

function getBus(id) {
  let b = buses.get(id)
  if (!b) {
    b = new EventEmitter()
    b.setMaxListeners(50)
    buses.set(id, b)
    replays.set(id, [])
  }
  return b
}

function emit(id, type, data) {
  const bus = getBus(id)
  const evt = { type, data, t: Date.now() }
  const buf = replays.get(id) || []
  buf.push(evt)
  if (buf.length > MAX_REPLAY_PER_LOOP) buf.shift()
  bus.emit('event', evt)
  return evt
}

export function subscribe(id, onEvent) {
  const bus = getBus(id)
  const handler = (evt) => onEvent(evt)
  bus.on('event', handler)
  // Replay past events first so a late SSE client catches up
  const past = replays.get(id) || []
  for (const evt of past) handler(evt)
  return () => bus.off('event', handler)
}

function dropBus(id) {
  buses.delete(id)
  replays.delete(id)
}

// ─────────────────────────────────────────────────────────────────────────────
// Build the user's business-context string from uploads + scrapes
// ─────────────────────────────────────────────────────────────────────────────
const CONTEXT_CHAR_BUDGET = 6000

async function buildBusinessContext(userId) {
  const [uploads, scrapes] = await Promise.all([
    Upload.find({ userId, status: 'ready' }).sort({ createdAt: -1 }).limit(20).lean(),
    Scrape.find({ userId, status: 'ready' }).sort({ createdAt: -1 }).limit(20).lean(),
  ])

  const sourceIds = [
    ...uploads.map((u) => ({ id: u._id, label: `Upload: ${u.fileName}` })),
    ...scrapes.map((s) => ({ id: s._id, label: `Web: ${s.title || s.url}` })),
  ]

  if (!sourceIds.length) {
    return {
      contextString: '',
      counts: { uploads: 0, scrapes: 0, chunks: 0 },
    }
  }

  const chunks = await Chunk.find({
    userId,
    sourceId: { $in: sourceIds.map((s) => s.id) },
  })
    .sort({ ix: 1 })
    .limit(40)
    .lean()

  // Group chunks under their source label, in order
  const bySource = new Map()
  for (const c of chunks) {
    const label = sourceIds.find((s) => String(s.id) === String(c.sourceId))?.label || 'Unknown'
    if (!bySource.has(label)) bySource.set(label, [])
    bySource.get(label).push(c.text)
  }

  // Assemble within budget — round-robin across sources so no single source dominates
  const lines = []
  let used = 0
  const queues = [...bySource.entries()].map(([label, ts]) => ({ label, ts }))
  let firstChunkOfSource = new Set()

  outer: while (queues.some((q) => q.ts.length)) {
    for (const q of queues) {
      if (!q.ts.length) continue
      const t = q.ts.shift()
      const header = firstChunkOfSource.has(q.label) ? '' : `\n\n[${q.label}]\n`
      firstChunkOfSource.add(q.label)
      const block = header + t
      if (used + block.length > CONTEXT_CHAR_BUDGET) {
        // try to fit a truncated piece
        const room = CONTEXT_CHAR_BUDGET - used - header.length
        if (room > 200) {
          lines.push(header + t.slice(0, room) + '…')
          used = CONTEXT_CHAR_BUDGET
        }
        break outer
      }
      lines.push(block)
      used += block.length
    }
  }

  return {
    contextString: lines.join('').trim(),
    counts: {
      uploads: uploads.length,
      scrapes: scrapes.length,
      chunks: chunks.length,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Synthesis: take all 10 agent outputs and pick the strongest 2-3 strategies.
// ─────────────────────────────────────────────────────────────────────────────
async function synthesize(concept, agentOutputs) {
  const compiled = agentOutputs
    .filter((a) => a.output)
    .map((a) => `[${a.lens}]\n${a.output}`)
    .join('\n\n---\n\n')

  const prompt = `You are the Synthesis Agent reading the outputs of 10 growth agents who each viewed a business through a different lens.

THE BUSINESS OWNER'S GOAL:
${concept}

THE 10 AGENT OUTPUTS:
${compiled}

YOUR JOB:
Identify the 2 to 3 strongest, most-actionable growth strategies that emerge from these outputs (cross-agent themes are usually strongest). Then surface the 1 most overlooked cost-reduction opportunity if any agent raised one. Speak directly to the owner.

Output rules:
- 3-4 short paragraphs total. No bullet lists, no headings.
- Name specific tactics, channels, partners, or experiments.
- Quantify when reasonable.
- Don't list ALL agents — pick what's strongest, ignore the rest.`

  const r = await chat([{ role: 'user', content: prompt }], {
    role: 'reasoning',
    maxTokens: 700,
    temperature: 0.4,
  })
  return { text: (r.content || '').trim(), provider: r.provider, model: r.model, elapsedMs: r.elapsedMs }
}

// ─────────────────────────────────────────────────────────────────────────────
// Critique: stress-test the synthesis. Find the failure modes.
// ─────────────────────────────────────────────────────────────────────────────
async function critique(concept, synthesisText) {
  const prompt = `You are the Critic Agent. Stress-test this growth strategy synthesis.

THE OWNER'S GOAL: ${concept}

THE SYNTHESIS:
${synthesisText}

YOUR JOB:
1. Name the 2 most likely failure modes — what could break the strategy in the first 90 days.
2. For each, propose a concrete pre-mortem mitigation.
3. End with a 1-sentence verdict: SURVIVES (proceed as-is) | REFINE (specific change needed) | KILL (the strategy is wrong, restart).

Output rules:
- 2-3 short paragraphs.
- Be brutal but specific. No platitudes.
- Don't restate the synthesis — assume the reader has it.`

  const r = await chat([{ role: 'user', content: prompt }], {
    role: 'reasoning',
    maxTokens: 500,
    temperature: 0.3,
  })
  return { text: (r.content || '').trim(), provider: r.provider, model: r.model, elapsedMs: r.elapsedMs }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan: produce the final structured GrowthPlan from synthesis+critique.
// JSON-mode call to the reasoning model.
// ─────────────────────────────────────────────────────────────────────────────
async function buildPlan(concept, synthesisText, critiqueText) {
  const prompt = `You are the Plan Builder. Convert the analysis below into a structured growth plan as STRICT JSON.

OWNER'S GOAL: ${concept}

SYNTHESIS:
${synthesisText}

CRITIQUE:
${critiqueText}

Return ONLY a JSON object with these keys (all strings unless noted):
{
  "title": "<10-word punchy plan title>",
  "oneLiner": "<one-sentence summary>",
  "problemSolved": "<the underlying business problem>",
  "growthOpportunities": ["<3-5 specific opportunities>"],
  "executionPlan": [
    { "phase": "Phase 1: ...", "duration": "<e.g. 2 weeks>", "steps": ["<concrete step>", "..."] },
    { "phase": "Phase 2: ...", "duration": "...", "steps": [...] },
    { "phase": "Phase 3: ...", "duration": "...", "steps": [...] }
  ],
  "costStructure": {
    "items": [{ "name": "<line item>", "estimate": "<₹/$ amount or range>", "notes": "<short>" }],
    "totalEstimate": "<range>",
    "notes": "<one-line explanation>"
  },
  "costCutOpportunities": [
    { "name": "<area>", "savings": "<estimate>", "how": "<one sentence>" }
  ],
  "noveltyScore": <0..1 number>,
  "feasibilityScore": <0..1 number>,
  "impactScore": <0..1 number>,
  "competitorAnalysis": ["<3-5 named competitors or analogs>"],
  "marketConnections": ["<3-5 adjacent markets or partner categories>"],
  "nextExperiments": ["<3 sharp experiments for week 1>"],
  "timeToFirstResults": "<e.g. 30 days, 8 weeks>"
}

Rules:
- Return ONLY valid JSON. No prose before or after, no markdown fences.
- Be concrete; never use placeholders like "TBD" or "various".`

  const r = await chat([{ role: 'user', content: prompt }], {
    role: 'reasoning',
    maxTokens: 1500,
    temperature: 0.4,
    jsonMode: true,
  })

  let plan
  try {
    plan = JSON.parse(stripFences(r.content || '{}'))
  } catch {
    plan = { error: 'plan_parse_failed', raw: r.content }
  }
  return { plan, provider: r.provider, model: r.model, elapsedMs: r.elapsedMs }
}

function stripFences(s) {
  return String(s)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: kick off a growth loop. Returns immediately; runs in background.
// Caller subscribes to events via subscribe(growthId, onEvent).
// ─────────────────────────────────────────────────────────────────────────────
export async function startGrowthLoop({ userId, concept }) {
  // Plan-gating — throws { code: 'PLAN_LIMIT' } if over limit.
  await assertWithinPlanLimit(userId)

  const doc = await Growth.create({
    userId,
    concept,
    status: 'queued',
    startedAt: new Date(),
  })
  await incrementUsage(userId)
  const id = String(doc._id)

  // Run async — don't block the request
  ;(async () => {
    const t0 = Date.now()
    try {
      // 1. Gather context
      doc.status = 'gathering'
      await doc.save()
      emit(id, 'status', { status: 'gathering' })
      const { contextString, counts } = await buildBusinessContext(userId)
      doc.contextLength = contextString.length
      doc.sourceCounts = counts
      await doc.save()
      emit(id, 'context', { contextLength: contextString.length, ...counts })

      // 2. Run 10 agents (sequential — provider rate limits)
      doc.status = 'reasoning'
      await doc.save()
      // Filter by admin-enabled agent set (defaults to all 10).
      const enabledSet = new Set(getEnabledAgents())
      const activeAgents = AGENT_NAMES.filter((n) => enabledSet.has(n))
      emit(id, 'status', { status: 'reasoning', total: activeAgents.length })

      const agentResults = []
      for (const name of activeAgents) {
        emit(id, 'agent_start', { lens: name })
        try {
          const r = await ALL_AGENTS[name](concept, contextString)
          agentResults.push({ ...r, completedAt: new Date() })
          doc.agents.push({ ...r, completedAt: new Date() })
          await doc.save()
          emit(id, 'agent_output', r)
        } catch (err) {
          const failed = {
            lens: name,
            output: '',
            provider: '',
            model: '',
            elapsedMs: 0,
            error: err.message?.slice(0, 300) || 'agent failed',
            completedAt: new Date(),
          }
          agentResults.push(failed)
          doc.agents.push(failed)
          await doc.save()
          emit(id, 'agent_error', failed)
        }
      }

      // 3. Synthesize — failure here is non-fatal; we still have agent outputs
      doc.status = 'synthesizing'
      await doc.save()
      emit(id, 'status', { status: 'synthesizing' })
      let synText = ''
      try {
        const syn = await synthesize(concept, agentResults)
        synText = syn.text
        doc.synthesis = synText
        await doc.save()
        emit(id, 'synthesis', syn)
      } catch (err) {
        const msg = err.message?.slice(0, 300) || 'synthesis failed'
        doc.synthesis = ''
        await doc.save()
        emit(id, 'synthesis_error', { message: msg })
      }

      // 4. Critique — also non-fatal
      doc.status = 'critiquing'
      await doc.save()
      emit(id, 'status', { status: 'critiquing' })
      let critText = ''
      if (synText) {
        try {
          const crit = await critique(concept, synText)
          critText = crit.text
          doc.critique = critText
          await doc.save()
          emit(id, 'critique', crit)
        } catch (err) {
          const msg = err.message?.slice(0, 300) || 'critique failed'
          await doc.save()
          emit(id, 'critique_error', { message: msg })
        }
      }

      // 5. Plan (structured) — also non-fatal. Even with no plan, the user
      // still gets agents + synthesis + critique, which is most of the value.
      doc.status = 'planning'
      await doc.save()
      emit(id, 'status', { status: 'planning' })
      if (synText) {
        try {
          const planned = await buildPlan(concept, synText, critText)
          if (planned.plan && !planned.plan.error) {
            doc.plan = planned.plan
          }
          await doc.save()
          emit(id, 'plan', planned)
        } catch (err) {
          const msg = err.message?.slice(0, 300) || 'plan failed'
          await doc.save()
          emit(id, 'plan_error', { message: msg })
        }
      }

      // 6. Done — always reach this so the user sees their partial result
      doc.status = 'complete'
      doc.completedAt = new Date()
      doc.totalElapsedMs = Date.now() - t0
      await doc.save()
      emit(id, 'complete', { id, totalElapsedMs: doc.totalElapsedMs })
    } catch (err) {
      // Only reached if context-gathering or the agent loop itself blew up
      doc.status = 'error'
      doc.error = err.message?.slice(0, 1000) || 'growth loop failed'
      doc.totalElapsedMs = Date.now() - t0
      await doc.save()
      emit(id, 'error', { message: doc.error })
    } finally {
      // Keep replay buffer for ~5 minutes so a refresh after completion still works
      setTimeout(() => dropBus(id), 5 * 60 * 1000)
    }
  })()

  return doc
}
