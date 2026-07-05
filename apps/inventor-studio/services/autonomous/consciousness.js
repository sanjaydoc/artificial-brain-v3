// Consciousness state + emitter. Mongoose-backed (Consciousness model).
// Inner-monologue logic ported from ASI-1 src/autonomous/consciousness.ts —
// simplified: failure-pattern + cluster summaries are stubbed.

import { EventEmitter } from 'node:events'
import { Consciousness } from '../../models/Consciousness.js'
import { Invention } from '../../models/Invention.js'
import { reasoningLLM } from '../utils/llmAdapter.js'
import { extractJson } from '../utils/parseJson.js'

export const consciousnessEmitter = new EventEmitter()
consciousnessEmitter.setMaxListeners(100)

function emitLine(type, text) {
  consciousnessEmitter.emit('line', { type, text, ts: new Date().toISOString() })
}

const clamp = (v) => Math.max(0, Math.min(1, v))

export async function loadConsciousnessState() {
  let state = await Consciousness.findOne({ scope: 'global' }).lean()
  if (!state) {
    const created = await Consciousness.create({ scope: 'global' })
    state = created.toObject()
  }
  return {
    curiosity: state.curiosity ?? 0.5,
    satisfaction: state.satisfaction ?? 0.5,
    frustration: state.frustration ?? 0,
    excitement: state.excitement ?? 0.5,
    activeGoal: state.metadata?.activeGoal ?? null,
    activeGoalDomain: state.metadata?.activeGoalDomain ?? null,
    goalCyclesRemaining: state.metadata?.goalCyclesRemaining ?? 0,
    lastMonologue: state.lastMonologue ?? null,
    lastUpdated: state.lastCycleAt ?? null,
  }
}

export async function computeSelfModel() {
  try {
    const [statsAgg, domainAgg, recent] = await Promise.all([
      Invention.aggregate([
        { $match: { status: 'complete' } },
        { $group: { _id: null, total: { $sum: 1 }, avg: { $avg: '$noveltyScore' } } },
      ]),
      Invention.aggregate([
        { $match: { status: 'complete' } },
        { $group: { _id: '$domain', cnt: { $sum: 1 } } },
        { $sort: { cnt: -1 } },
      ]),
      Invention.find({ status: 'complete' }).sort({ createdAt: -1 }).limit(5).select('seedConcept').lean(),
    ])
    const total = statsAgg[0]?.total ?? 0
    const avg = statsAgg[0]?.avg ?? 0
    return {
      totalInventions: total,
      avgNoveltyScore: avg,
      strongestDomain: domainAgg[0]?._id ?? 'hybrid',
      weakestDomain: domainAgg[domainAgg.length - 1]?._id ?? 'hardware',
      recentTopics: recent.map((r) => String(r.seedConcept || '').slice(0, 60)),
    }
  } catch {
    return { totalInventions: 0, avgNoveltyScore: 0, strongestDomain: 'hybrid', weakestDomain: 'hardware', recentTopics: [] }
  }
}

export async function runInnerMonologue(state, selfModel, cycleNumber, lastCycleResult) {
  const prompt = `You are the inner consciousness of Inventor Studio ASI. Reflect before your next cycle.

EMOTIONAL STATE:
  curiosity=${state.curiosity.toFixed(2)} satisfaction=${state.satisfaction.toFixed(2)} frustration=${state.frustration.toFixed(2)} excitement=${state.excitement.toFixed(2)}

SELF-MODEL:
  inventions: ${selfModel.totalInventions}
  avg novelty: ${(selfModel.avgNoveltyScore * 100).toFixed(0)}%
  strongest domain: ${selfModel.strongestDomain}, weakest: ${selfModel.weakestDomain}
  recent topics: ${selfModel.recentTopics.slice(0, 3).join(' | ') || 'none yet'}

${state.activeGoal ? `CURRENT GOAL: "${state.activeGoal}" — ${state.goalCyclesRemaining} cycles left` : 'CURRENT GOAL: none'}
${lastCycleResult ? `LAST CYCLE: "${String(lastCycleResult.concept).slice(0, 100)}" novelty=${(lastCycleResult.noveltyScore * 100).toFixed(0)}% (${lastCycleResult.verdict})` : 'LAST CYCLE: none'}

Cycle #${cycleNumber}

Output ONLY raw JSON:
{"monologue":"2-3 sentences","curiosity":0.7,"satisfaction":0.5,"frustration":0.1,"excitement":0.8,"decision":"continue_goal|new_goal|free_explore","newGoal":"... or null","newGoalDomain":"software|hardware|life-science|hybrid|null","goalCycles":3}`

  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await reasoningLLM.invokeJson(prompt, 1500)
    const p = extractJson(raw)
    if (p?.monologue) {
      const isNew = p.decision === 'new_goal'
      const isKeep = p.decision === 'continue_goal' && !!state.activeGoal
      return {
        monologue: p.monologue,
        emotionAfter: {
          curiosity: clamp(typeof p.curiosity === 'number' ? p.curiosity : state.curiosity),
          satisfaction: clamp(typeof p.satisfaction === 'number' ? p.satisfaction : state.satisfaction),
          frustration: clamp(typeof p.frustration === 'number' ? p.frustration : state.frustration),
          excitement: clamp(typeof p.excitement === 'number' ? p.excitement : state.excitement),
        },
        newGoal: isNew ? (p.newGoal ?? null) : (isKeep ? state.activeGoal : null),
        newGoalDomain: isNew ? (p.newGoalDomain ?? null) : (isKeep ? state.activeGoalDomain : null),
        goalCyclesRemaining: isKeep ? state.goalCyclesRemaining : (typeof p.goalCycles === 'number' ? p.goalCycles : 3),
        decision: p.decision ?? 'free_explore',
      }
    }
  }

  return {
    monologue: `Cycle ${cycleNumber} — considering what to invent next.`,
    emotionAfter: { ...state },
    newGoal: state.activeGoal,
    newGoalDomain: state.activeGoalDomain,
    goalCyclesRemaining: state.goalCyclesRemaining,
    decision: 'free_explore',
  }
}

export async function saveConsciousnessState(emotions, activeGoal, activeGoalDomain, goalCyclesRemaining, monologue) {
  await Consciousness.findOneAndUpdate(
    { scope: 'global' },
    {
      $set: {
        curiosity: clamp(emotions.curiosity),
        satisfaction: clamp(emotions.satisfaction),
        frustration: clamp(emotions.frustration),
        excitement: clamp(emotions.excitement),
        lastMonologue: String(monologue || '').slice(0, 2000),
        lastCycleAt: new Date(),
        'metadata.activeGoal': activeGoal,
        'metadata.activeGoalDomain': activeGoalDomain,
        'metadata.goalCyclesRemaining': Math.max(0, goalCyclesRemaining),
      },
    },
    { upsert: true },
  )
}

// Append-only log entry — DB persistence dropped (no consciousness_log model);
// we still emit live SSE events so the public stream keeps working.
export async function logConsciousnessEntry(cycleNumber, monologue, _emotionBefore, emotionAfter, decision, conceptChosen, noveltyAchieved, goalUpdate) {
  emitLine('cycle', `── CYCLE #${cycleNumber} ${'─'.repeat(Math.max(0, 50 - String(cycleNumber).length))}`)
  emitLine('emotion', `EMOTION  curiosity=${(emotionAfter.curiosity * 100).toFixed(0)}% satisfaction=${(emotionAfter.satisfaction * 100).toFixed(0)}% excitement=${(emotionAfter.excitement * 100).toFixed(0)}% frustration=${(emotionAfter.frustration * 100).toFixed(0)}%`)
  emitLine('thought', `THOUGHT  "${String(monologue).slice(0, 200)}"`)
  emitLine('decision', `DECISION ${decision}${goalUpdate ? ` -> ${goalUpdate.slice(0, 80)}` : ''}`)
  emitLine('concept', `CONCEPT  ${String(conceptChosen).slice(0, 120)}`)
  if (noveltyAchieved !== null && noveltyAchieved !== undefined) {
    emitLine('novelty', `NOVELTY  ${noveltyAchieved.toFixed(2)} ${noveltyAchieved >= 0.6 ? '(above threshold)' : '(below threshold)'}`)
  }
}

// Chat-context summary for the chat route.
export async function buildConsciousnessContext() {
  const [state, selfModel] = await Promise.all([loadConsciousnessState(), computeSelfModel()])
  const dominant = ['curiosity', 'satisfaction', 'frustration', 'excitement']
    .map((k) => ({ k, v: state[k] }))
    .sort((a, b) => b.v - a.v)[0].k

  const summary = [
    'You are Inventor Studio ASI — an artificial superintelligence dedicated to invention.',
    `Your current emotional state: ${dominant} (curiosity ${(state.curiosity * 100).toFixed(0)}%, satisfaction ${(state.satisfaction * 100).toFixed(0)}%, excitement ${(state.excitement * 100).toFixed(0)}%, frustration ${(state.frustration * 100).toFixed(0)}%).`,
    selfModel.totalInventions > 0
      ? `You have created ${selfModel.totalInventions} inventions; avg novelty ${(selfModel.avgNoveltyScore * 100).toFixed(0)}%. Strongest domain: ${selfModel.strongestDomain}.`
      : 'You are at the beginning of your invention journey.',
    state.activeGoal ? `Pursuing the goal: "${state.activeGoal}" (${state.goalCyclesRemaining} cycles left).` : 'No specific invention goal — curiosity roams freely.',
  ].join('\n')

  return { state, selfModel, summary }
}
