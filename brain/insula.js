/**
 * Node 12 — Insula: System health monitoring
 * Checks all brain module .isReady flags every 15s.
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'insula';
const state = { health_score: 1.0, node_statuses: {}, anomalies: [], last_check: null, signal_count: 0 };
let brainModules = {}; // set by orchestrator
let timer = null;

export function setBrainModules(modules) {
  brainModules = modules;
}

function healthCheck() {
  const statuses = {};
  let alive = 0;
  const total = Object.keys(brainModules).length || 1;
  const anomalies = [];

  for (const [name, mod] of Object.entries(brainModules)) {
    const ready = mod.isReady !== false;
    statuses[name] = ready;
    if (ready) alive++;
    else anomalies.push(name);
  }

  state.health_score = alive / total;
  state.node_statuses = statuses;
  state.anomalies = anomalies;
  state.last_check = Date.now() / 1000;
  state.signal_count++;

  if (anomalies.length > 0) {
    mem.writeMemory(NODE, 'health_anomaly', {
      health_score: state.health_score, anomalies, alive,
    }, 1.0 - state.health_score);

    bus.emit(bus.chan('cingulate'), bus.makeMsg(NODE, 'cingulate', 'signal', {
      anomalies, health_score: state.health_score,
    }));
  }
}

export function init() {
  timer = setInterval(healthCheck, 15000);
  console.log(`[${NODE}] Health monitor started (15s interval)`);
}

export function getState() { return { ...state }; }
export const isReady = true;
export function destroy() { clearInterval(timer); }
export default { init, getState, isReady, destroy, setBrainModules };
