/**
 * Node 11 — Basal Ganglia: Habit formation
 * Rolling average reward per action. Caps at 100 habits.
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'basal_ganglia';
const MAX_HABITS = 100;
const habitTable = new Map(); // action → {count, totalReward, strength}
const state = {
  total_reinforcements: 0, last_boosted: null, best_habit: null, best_strength: 0,
};

function reinforce(action, reward) {
  if (!habitTable.has(action)) {
    habitTable.set(action, { count: 0, totalReward: 0, strength: 0 });
  }
  const h = habitTable.get(action);
  h.count++;
  h.totalReward += reward;
  h.strength = h.totalReward / h.count;
  state.total_reinforcements++;
  state.last_boosted = action;

  // Cap habits
  if (habitTable.size > MAX_HABITS) {
    let weakest = null, weakestStrength = Infinity;
    for (const [k, v] of habitTable) {
      if (v.strength < weakestStrength) { weakest = k; weakestStrength = v.strength; }
    }
    if (weakest) habitTable.delete(weakest);
  }

  // Find best
  let best = null, bestStr = -Infinity;
  for (const [k, v] of habitTable) {
    if (v.strength > bestStr) { best = k; bestStr = v.strength; }
  }
  state.best_habit = best;
  state.best_strength = bestStr;

  return { best, strength: bestStr };
}

function onSignal(msg) {
  const p = msg.payload || {};
  const reward = Number(p.reward ?? p.value ?? 0);
  const action = p.action || p.goal || 'unknown';

  if (reward === 0) return;

  const { best, strength } = reinforce(action, reward);

  mem.writeMemory(NODE, 'habit_reinforced', {
    action, strength: habitTable.get(action)?.strength, count: habitTable.get(action)?.count,
  }, Math.min(Math.abs(strength), 1.0));

  // Publish best habit to prefrontal
  bus.emit(bus.chan('prefrontal'), bus.makeMsg(NODE, 'prefrontal', 'habit_boost', {
    best_habit: best, strength,
  }));
}

export function init() {
  bus.on(bus.chan(NODE), onSignal);
  console.log(`[${NODE}] Habit table ready`);
}

export function getState() {
  return {
    ...state,
    habit_count: habitTable.size,
    habits: Object.fromEntries([...habitTable.entries()].sort((a, b) => b[1].strength - a[1].strength).slice(0, 10)),
  };
}

export const isReady = true;
export function destroy() { bus.off(bus.chan(NODE), onSignal); }
export default { init, getState, isReady, destroy };
