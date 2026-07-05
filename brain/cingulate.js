/**
 * Node 13 — Cingulate Cortex: Conflict detection
 * If current goal has reward < -0.5, flag conflict + suggest fallback.
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'cingulate';
const ALL_GOALS = [
  'observe environment', 'maintain balance', 'explore forward',
  'avoid obstacles', 'learn from experience', 'rest and consolidate',
];
const FALLBACK = {
  'explore forward': 'observe environment',
  'maintain balance': 'rest and consolidate',
  'avoid obstacles': 'observe environment',
  'learn from experience': 'rest and consolidate',
  'observe environment': 'maintain balance',
  'rest and consolidate': 'observe environment',
};

const state = {
  conflict_count: 0, last_conflict: null, resolution: null,
  current_goal: null, current_reward: 0, signal_count: 0,
};

function checkConflict() {
  if (!state.current_goal || !ALL_GOALS.includes(state.current_goal)) return;
  if (state.current_reward >= -0.5) return;

  const conflict = `Goal '${state.current_goal}' conflicts with negative reward ${state.current_reward.toFixed(2)}`;
  const resolution = `Switch to: ${FALLBACK[state.current_goal] || 'observe environment'}`;

  state.conflict_count++;
  state.last_conflict = conflict;
  state.resolution = resolution;

  mem.writeMemory(NODE, 'conflict_detected', {
    conflict, resolution, goal: state.current_goal, reward: state.current_reward,
  }, 0.7);

  bus.emit(bus.chan('prefrontal'), bus.makeMsg(NODE, 'prefrontal', 'conflict_alert', {
    conflict, resolution, goal: state.current_goal, reward: state.current_reward,
  }));
}

function onSignal(msg) {
  state.signal_count++;
  const p = msg.payload || {};

  if (p.goal) state.current_goal = p.goal;
  if (p.reward !== undefined) state.current_reward = Number(p.reward);
  if (p.value !== undefined) state.current_reward = Number(p.value);

  checkConflict();
}

export function init() {
  bus.on(bus.chan(NODE), onSignal);
  console.log(`[${NODE}] Conflict detector ready (6 goals monitored)`);
}

export function getState() { return { ...state }; }
export const isReady = true;
export function destroy() { bus.off(bus.chan(NODE), onSignal); }
export default { init, getState, isReady, destroy };
