/**
 * Node 02 — Hippocampus: Episodic memory consolidation
 * Every 60s: promote high-importance old memories, prune low-importance.
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'hippocampus';
const INTERVAL = 60000; // 60s
const THRESHOLD = 0.6;
const AGE_SEC = 300; // 5 minutes

const state = {
  consolidation_count: 0, total_promoted: 0, total_pruned: 0,
  last_consolidation: null, signal_count: 0,
};
let timer = null;

async function consolidationLoop() {
  const { promoted, pruned } = await mem.consolidate(THRESHOLD, AGE_SEC);
  state.consolidation_count++;
  state.total_promoted += promoted;
  state.total_pruned += pruned;
  state.last_consolidation = Date.now() / 1000;

  if (promoted > 0 || pruned > 0) {
    mem.writeMemory(NODE, 'consolidation', {
      promoted, pruned, pass: state.consolidation_count,
    }, 0.5);
  }
}

function onSignal(msg) {
  state.signal_count++;
  const p = msg.payload || {};

  if (msg.type === 'store') {
    // Store episode from other nodes
    const content = JSON.stringify(p).slice(0, 2000);
    const importance = p.importance ?? 0.5;
    mem.writeMemory(msg.from || NODE, 'episode_store', content, importance);
  }
}

export function init() {
  bus.on(bus.chan(NODE), onSignal);
  timer = setInterval(consolidationLoop, INTERVAL);
  console.log(`[${NODE}] Memory consolidation started (${INTERVAL / 1000}s interval)`);
}

export async function recall(limit = 5) {
  return mem.readMemory(NODE, limit);
}

export async function recallAll(limit = 50) {
  return mem.readAllMemories(limit);
}

export function getState() { return { ...state }; }
export const isReady = true;
export function destroy() {
  bus.off(bus.chan(NODE), onSignal);
  clearInterval(timer);
}
export default { init, getState, isReady, destroy, recall, recallAll };
