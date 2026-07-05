/**
 * Node 14 — Brainstem: Heartbeat watchdog
 * Periodic tick every 30s signaling the brain is alive.
 */
import bus from './bus.js';

const NODE = 'brainstem';
const state = { uptime_s: 0, heartbeat_count: 0, last_heartbeat: null };
let startTime = null;
let timer = null;

function heartbeat() {
  state.uptime_s = Math.round((Date.now() - startTime) / 1000);
  state.heartbeat_count++;
  state.last_heartbeat = Date.now() / 1000;

  bus.emit(bus.THALAMUS, bus.makeMsg(NODE, 'thalamus', 'signal', {
    heartbeat: true,
    uptime_s: state.uptime_s,
    beat: state.heartbeat_count,
  }));
}

export function init() {
  startTime = Date.now();
  timer = setInterval(heartbeat, 30000);
  console.log(`[${NODE}] Heartbeat started (30s interval)`);
}

export function getState() { return { ...state }; }
export const isReady = true;
export function destroy() { clearInterval(timer); }
export default { init, getState, isReady, destroy };
