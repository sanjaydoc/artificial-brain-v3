/**
 * Node 10 — Thalamus: Central signal router
 * Routes messages to target channels with config filtering.
 * Maintains signal log and active node tracking.
 */
import bus from './bus.js';
import config from './config.js';

const NODE = 'thalamus';
const MAX_LOG = 20;
const SIM_URL = process.env.SIM_TUNNEL_URL || 'https://sim.klabs.network';
const SIM_AUTH = process.env.TUNNEL_AUTH_TOKEN || '';

const state = {
  message_count: 0, active_nodes: new Set(), signal_log: [],
  node_states: {}, sim_ok: false,
};

// Callback for pushing brain state to WebSocket clients
let onBrainStateUpdate = null;
export function setStateCallback(fn) { onBrainStateUpdate = fn; }

function route(msg) {
  state.message_count++;
  state.active_nodes.add(msg.from);

  // Log signal
  state.signal_log.push({
    from: msg.from, to: msg.to, type: msg.type, ts: msg.ts,
  });
  if (state.signal_log.length > MAX_LOG) state.signal_log.shift();

  // Route to target
  const target = msg.to;
  if (!target || target === 'thalamus') return; // Don't route to self

  if (target === 'broadcast') {
    for (const n of config.ALL_NODES) {
      if (n === NODE) continue;
      if (!config.isNodeEnabled(n)) continue;
      if (!config.isRouteEnabled(msg.from, n)) continue;
      bus.emit(bus.chan(n), msg);
    }
  } else {
    if (!config.isNodeEnabled(target)) return;
    if (!config.isRouteEnabled(msg.from, target)) return;
    bus.emit(bus.chan(target), msg);
  }

  // Push to WebSocket clients
  if (onBrainStateUpdate) onBrainStateUpdate(getBrainState());
}

// Poll sim for world state
let simTimer = null;
async function pollSim() {
  try {
    const headers = SIM_AUTH ? { 'X-Auth-Token': SIM_AUTH } : {};
    const res = await fetch(`${SIM_URL}/state`, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) { state.sim_ok = false; return; }
    const data = await res.json();
    state.sim_ok = true;

    // Distribute to brain nodes
    const worldPayload = {
      reward: data.reward, base_pos: data.base_pos, fallen: data.fallen,
      step: data.step, joint_pos: data.joint_pos,
    };

    bus.emit(bus.chan('parietal_lobe'), bus.makeMsg(NODE, 'parietal_lobe', 'signal', worldPayload));
    bus.emit(bus.chan('cerebellum'), bus.makeMsg(NODE, 'cerebellum', 'signal', worldPayload));
    bus.emit(bus.chan('amygdala'), bus.makeMsg(NODE, 'amygdala', 'reward', { value: data.reward, source: 'sim' }));
    bus.emit(bus.chan('basal_ganglia'), bus.makeMsg(NODE, 'basal_ganglia', 'signal', { reward: data.reward, action: data.goal || 'unknown' }));

    // Every 10 polls, send to cingulate
    if (state.message_count % 10 === 0) {
      bus.emit(bus.chan('cingulate'), bus.makeMsg(NODE, 'cingulate', 'signal', { reward: data.reward }));
    }
  } catch {
    state.sim_ok = false;
  }
}

function getBrainState() {
  return {
    message_count: state.message_count,
    active_nodes: [...state.active_nodes],
    signal_log: [...state.signal_log],
    sim_ok: state.sim_ok,
    ts: Date.now() / 1000,
  };
}

export function init() {
  bus.on(bus.THALAMUS, route);
  simTimer = setInterval(pollSim, 2000); // Poll sim every 2s
  console.log(`[${NODE}] Central router ready, sim polling: ${SIM_URL}`);
}

export function getState() { return getBrainState(); }
export const isReady = true;
export function destroy() {
  bus.off(bus.THALAMUS, route);
  clearInterval(simTimer);
}
export default { init, getState, isReady, destroy, setStateCallback };
