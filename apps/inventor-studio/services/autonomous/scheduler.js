// Autonomous scheduler — start/stop/cycle wrapper around runAutonomousIteration.
// Ported from ASI-1 src/autonomous/scheduler.ts.

import { runAutonomousIteration } from './autonomousLoop.js'

const TIMEOUT_MS = parseInt(process.env.AUTONOMOUS_TIMEOUT_MINUTES || '120', 10) * 60 * 1000
const COOLDOWN_MS = parseInt(process.env.AUTONOMOUS_COOLDOWN_MINUTES || '30', 10) * 60 * 1000

let isRunning = false
let killSwitch = false
let cycleCount = 0
let startedAt = null
let lastCompletedAt = null
let lastNoveltyScore = null
let nextCycleTimer = null

async function runCycle() {
  if (killSwitch) { isRunning = false; return }
  if (isRunning) return
  isRunning = true
  cycleCount += 1
  console.log(`[scheduler] cycle ${cycleCount} starting`)

  let timedOut = false
  const timeoutHandle = setTimeout(() => { timedOut = true; console.error(`[scheduler] cycle ${cycleCount} timed out`) }, TIMEOUT_MS)

  try {
    const result = await runAutonomousIteration()
    if (result) lastNoveltyScore = result.noveltyScore
  } catch (err) {
    console.error(`[scheduler] cycle ${cycleCount} threw:`, err.message)
  } finally {
    clearTimeout(timeoutHandle)
    isRunning = false
    lastCompletedAt = new Date()
  }

  if (killSwitch || timedOut) return
  console.log(`[scheduler] cycle ${cycleCount} done — next in ${COOLDOWN_MS / 60000}min`)
  nextCycleTimer = setTimeout(runCycle, COOLDOWN_MS)
}

export function startScheduler() {
  if (isRunning) return { started: false, message: 'Already running a cycle' }
  if (nextCycleTimer && !killSwitch) return { started: false, message: 'Already scheduled' }
  killSwitch = false
  startedAt = new Date()
  console.log('[scheduler] STARTED')
  runCycle().catch((err) => console.error('[scheduler] start error:', err.message))
  return { started: true, message: 'Autonomous mode started' }
}

export function stopScheduler() {
  killSwitch = true
  if (nextCycleTimer) { clearTimeout(nextCycleTimer); nextCycleTimer = null }
  return { stopped: true, message: isRunning ? 'Will stop after current cycle' : 'Stopped immediately' }
}

export function skipCooldown() {
  if (isRunning) return { skipped: false, message: 'Cycle running' }
  if (!nextCycleTimer || killSwitch) return { skipped: false, message: 'Not in cooldown' }
  clearTimeout(nextCycleTimer)
  nextCycleTimer = null
  runCycle()
  return { skipped: true, message: 'Cooldown skipped' }
}

export function getSchedulerStatus() {
  return {
    autonomousModeEnabled: process.env.AUTONOMOUS_MODE === 'true',
    running: isRunning,
    killed: killSwitch,
    cycleCount,
    startedAt,
    lastCompletedAt,
    lastNoveltyScore,
    cooldownMinutes: COOLDOWN_MS / 60000,
    timeoutMinutes: TIMEOUT_MS / 60000,
    nextCycleScheduled: !isRunning && nextCycleTimer !== null && !killSwitch,
  }
}
