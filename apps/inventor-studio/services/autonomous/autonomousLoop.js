// One-iteration runner for the autonomous scheduler.
// Ported (simplified) from ASI-1 src/autonomous/autonomousLoop.ts —
// failure pattern recording + per-run history table omitted (no Mongo model).

import { Invention } from '../../models/Invention.js'
import { User } from '../../models/User.js'
import { runDreamLoop } from '../dreamLoop.js'
import { selectNextTopic } from './topicSelector.js'
import { loadConsciousnessState, computeSelfModel, runInnerMonologue, saveConsciousnessState, logConsciousnessEntry } from './consciousness.js'

const NOVELTY_THRESHOLD = parseFloat(process.env.AUTONOMOUS_NOVELTY_THRESHOLD || '0.6')
const MAX_RETRIES = parseInt(process.env.AUTONOMOUS_MAX_RETRIES || '2', 10)

let _systemUserId = null

export async function ensureSystemUser() {
  if (_systemUserId) return _systemUserId
  const email = 'asi-system@inventor-studio.internal'
  let u = await User.findOne({ email }).lean()
  if (!u) {
    const created = await User.create({
      email,
      passwordHash: 'not-a-real-password',
      role: 'Admin',
      approvalStatus: 'approved',
    })
    u = created.toObject()
  }
  _systemUserId = u._id
  return _systemUserId
}

let cycleCount = 0

export async function runAutonomousIteration() {
  const startTime = Date.now()
  cycleCount += 1
  const thisCycle = cycleCount

  const systemUserId = await ensureSystemUser()

  const [state, selfModel] = await Promise.all([loadConsciousnessState(), computeSelfModel()])
  const lastCompleted = await Invention.findOne({ status: 'complete' }).sort({ updatedAt: -1 }).select('seedConcept noveltyScore').lean()
  const lastCycleResult = lastCompleted ? { concept: lastCompleted.seedConcept, noveltyScore: lastCompleted.noveltyScore || 0, verdict: 'complete' } : null

  const reflection = await runInnerMonologue(state, selfModel, thisCycle, lastCycleResult)
  const emotionBefore = { curiosity: state.curiosity, satisfaction: state.satisfaction, frustration: state.frustration, excitement: state.excitement }
  await saveConsciousnessState(reflection.emotionAfter, reflection.newGoal, reflection.newGoalDomain, reflection.goalCyclesRemaining, reflection.monologue)

  let topic
  if (reflection.newGoal && reflection.goalCyclesRemaining > 0) {
    topic = { concept: reflection.newGoal, source: 'consciousness' }
  } else {
    topic = await selectNextTopic()
  }

  let lastNoveltyScore = 0
  let lastVerdict = 'below_threshold'
  let inventionId = ''
  let retryCount = 0

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) retryCount += 1
    const seedConcept = attempt === 0
      ? topic.concept
      : `${topic.concept} [previous attempt scored ${(lastNoveltyScore * 100).toFixed(0)}% novelty — explore a fundamentally different approach]`

    const inv = await Invention.create({
      userId: systemUserId,
      seedConcept: topic.concept,
      mode: 'dream',
      status: 'pending',
    })
    inventionId = String(inv._id)

    const mvpSpec = await runDreamLoop({
      inventionId,
      concept: seedConcept,
      mode: 'dream',
      userId: systemUserId,
      consciousnessState: state,
    })
    if (!mvpSpec) continue

    lastNoveltyScore = mvpSpec.noveltyScore ?? 0
    lastVerdict = lastNoveltyScore >= NOVELTY_THRESHOLD ? 'survives' : 'below_threshold'
    if (lastNoveltyScore >= NOVELTY_THRESHOLD) break
  }

  const durationSeconds = Math.round((Date.now() - startTime) / 1000)
  if (topic.source === 'consciousness' && reflection.goalCyclesRemaining > 0) {
    const remaining = reflection.goalCyclesRemaining - 1
    await saveConsciousnessState(
      reflection.emotionAfter,
      remaining > 0 ? reflection.newGoal : null,
      remaining > 0 ? reflection.newGoalDomain : null,
      remaining,
      reflection.monologue,
    )
  }

  await logConsciousnessEntry(thisCycle, reflection.monologue, emotionBefore, reflection.emotionAfter, reflection.decision, topic.concept, lastNoveltyScore, reflection.newGoal ? `New goal: ${reflection.newGoal}` : null)

  return {
    inventionId,
    concept: topic.concept,
    noveltyScore: lastNoveltyScore,
    verdict: lastVerdict,
    retryCount,
    durationSeconds,
    topicSource: topic.source,
  }
}
