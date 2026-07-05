/**
 * Node 04 — Cerebellum: Motor output coordinator
 * Calls RL tunnel for SmolVLA actions + sinusoidal gait fallback.
 * Sends actions to sim tunnel. Records reward for RL training.
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'cerebellum';
const RL_URL = process.env.RL_TUNNEL_URL || 'https://rl.klabs.network';
const SIM_URL = process.env.SIM_TUNNEL_URL || 'https://sim.klabs.network';
const AUTH = process.env.TUNNEL_AUTH_TOKEN || '';
const ALPHA = 0.3; // Smoothing factor

const state = {
  last_action: [0, 0, 0, 0, 0, 0, 0],
  rl_mode: 'sinusoidal', sim_ok: false, sim_reward: 0,
  sim_fallen: false, sim_step: 0, signal_count: 0,
  goal: 'stand', frame_b64: null,
};

// ── Sinusoidal Gait (pure math fallback) ────────────────────────────────────
let phase = 0;

function sinusoidal(goal) {
  phase += 0.18;
  const s = Math.sin(phase * 2 * Math.PI);
  const c = Math.cos(phase * 2 * Math.PI);

  switch (goal) {
    case 'walk': case 'forward': case 'explore':
      return [
        0.025,                    // L_hip_pitch (slight forward lean)
        0.04 + 0.05 * Math.max(0, s),  // L_knee
        0,                        // L_ankle
        0.025,                    // R_hip_pitch
        0.04 + 0.05 * Math.max(0, -s), // R_knee
        0,                        // R_ankle
        0.06 * Math.sin(phase * 0.35),  // waist_yaw (gentle sway)
      ];
    case 'sit':
      return [0, Math.min(0.18, phase * 0.02), 0, 0, Math.min(0.18, phase * 0.02), 0, 0];
    case 'wave':
      return [0, 0.02, 0, 0, 0.02, 0, 0.15 * s];
    case 'dance':
      return [0.02 * s, 0.04, 0, -0.02 * s, 0.04, 0, 0.1 * c];
    case 'balance':
      return [0.015 * s, 0.03, 0, -0.015 * s, 0.03, 0, 0];
    case 'turn':
      return [0, 0.02, 0, 0, 0.02, 0, 0.12 * s];
    default: // stand / rest
      return [0, 0.02, 0, 0, 0.02, 0, 0];
  }
}

// ── RL tunnel call ──────────────────────────────────────────────────────────

async function getRL(goal, frameb64, simState) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (AUTH) headers['X-Auth-Token'] = AUTH;
    const res = await fetch(`${RL_URL}/action`, {
      method: 'POST', headers,
      body: JSON.stringify({ goal, frame_b64: frameb64, sim_state: simState }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    state.rl_mode = data.mode || 'smolvla';
    return data.targets; // 7-DoF array
  } catch {
    return null;
  }
}

async function sendReward(value) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (AUTH) headers['X-Auth-Token'] = AUTH;
    await fetch(`${RL_URL}/reward`, {
      method: 'POST', headers,
      body: JSON.stringify({ value }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {}
}

async function sendAction(targets) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (AUTH) headers['X-Auth-Token'] = AUTH;
    await fetch(`${SIM_URL}/action`, {
      method: 'POST', headers,
      body: JSON.stringify({ targets }),
      signal: AbortSignal.timeout(3000),
    });
    state.sim_ok = true;
  } catch {
    state.sim_ok = false;
  }
}

// ── Signal handling ─────────────────────────────────────────────────────────

async function onSignal(msg) {
  state.signal_count++;
  const p = msg.payload || {};

  // Capture goal from prefrontal
  if (p.goal) state.goal = p.goal;
  // Capture frame from visual cortex
  if (p.frame_b64) state.frame_b64 = p.frame_b64;
  // Capture sim state
  if (p.reward !== undefined) state.sim_reward = p.reward;
  if (p.fallen !== undefined) state.sim_fallen = p.fallen;
  if (p.step !== undefined) state.sim_step = p.step;

  // Generate action
  let raw = await getRL(state.goal, state.frame_b64, {
    reward: state.sim_reward, fallen: state.sim_fallen, step: state.sim_step,
  });

  if (!raw) {
    raw = sinusoidal(state.goal);
    state.rl_mode = 'sinusoidal';
  }

  // Smooth action
  const smoothed = raw.map((v, i) => ALPHA * v + (1 - ALPHA) * state.last_action[i]);
  state.last_action = smoothed;

  // Send to sim
  await sendAction(smoothed);

  // Record reward for RL
  if (state.sim_reward !== 0) {
    await sendReward(state.sim_reward);
  }

  // Fall detection
  if (state.sim_fallen) {
    try {
      const headers = {};
      if (AUTH) headers['X-Auth-Token'] = AUTH;
      await fetch(`${SIM_URL}/reset`, { method: 'POST', headers, signal: AbortSignal.timeout(3000) });
    } catch {}
    await sendReward(-0.5);
    phase = 0;
  }

  // Write memory on significant reward
  if (Math.abs(state.sim_reward) > 0.3) {
    mem.writeMemory(NODE, 'motor_episode', {
      goal: state.goal, reward: state.sim_reward,
      sim_step: state.sim_step, rl_mode: state.rl_mode,
    }, Math.min(Math.abs(state.sim_reward), 1.0));
  }

  // Publish to downstream nodes
  bus.emit(bus.chan('hippocampus'), bus.makeMsg(NODE, 'hippocampus', 'store', {
    action: state.goal, reward: state.sim_reward,
    joints: smoothed.map(v => Math.round(v * 1000) / 1000), sim_step: state.sim_step,
  }));
  bus.emit(bus.THALAMUS, bus.makeMsg(NODE, 'thalamus', 'signal', {
    goal: state.goal, reward: state.sim_reward, rl_mode: state.rl_mode,
  }));
}

export function init() {
  bus.on(bus.chan(NODE), onSignal);
  console.log(`[${NODE}] Motor coordinator ready (RL: ${RL_URL}, Sim: ${SIM_URL})`);
}

export function getState() {
  return {
    ...state,
    last_action: [...state.last_action],
  };
}

export const isReady = true;
export function destroy() { bus.off(bus.chan(NODE), onSignal); }
export default { init, getState, isReady, destroy };
