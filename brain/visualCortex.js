/**
 * Node 07 — Visual Cortex: Live camera from sim + moondream scene description
 * Polls sim camera via tunnel. Runs moondream every 10 frames.
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'visual_cortex';
const SIM_URL = process.env.SIM_TUNNEL_URL || 'https://sim.klabs.network';
const AUTH = process.env.TUNNEL_AUTH_TOKEN || '';
const CAM_INTERVAL = 3000; // 3s
const VISION_EVERY = 10;

let llm = null;
let timer = null;
const state = {
  frame_count: 0, brightness: 0.5, edge_density: 0,
  last_frame_b64: null, scene_description: null, sim_ok: false,
};

export function setLlm(llmService) { llm = llmService; }

function extractFeatures(base64) {
  // Basic brightness from base64 length heuristic (rough proxy)
  // Real feature extraction would decode JPEG, but for tunnel this is sufficient
  const size = base64.length;
  state.brightness = Math.min(1, size / 100000); // Rough heuristic
  state.edge_density = Math.random() * 0.3 + 0.1; // Placeholder until real processing
  return { brightness: state.brightness, edge_density: state.edge_density, scene: state.brightness > 0.5 ? 'bright' : 'dark' };
}

async function describeScene(base64) {
  if (!llm) return null;
  try {
    const messages = [
      { role: 'user', content: 'What do you see? Describe the robot and environment in one sentence.', images: [base64] },
    ];
    const desc = await llm.chat(messages, { role: 'vision', maxTokens: 80 });
    return desc;
  } catch { return null; }
}

async function cameraLoop() {
  try {
    const headers = {};
    if (AUTH) headers['X-Auth-Token'] = AUTH;
    const res = await fetch(`${SIM_URL}/camera`, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) { state.sim_ok = false; return; }

    const buf = Buffer.from(await res.arrayBuffer());
    const base64 = buf.toString('base64');
    state.sim_ok = true;
    state.frame_count++;
    state.last_frame_b64 = base64;

    const features = extractFeatures(base64);

    // Run moondream every N frames
    if (state.frame_count % VISION_EVERY === 0) {
      const desc = await describeScene(base64);
      if (desc) {
        state.scene_description = desc;
        mem.writeMemory(NODE, 'scene_description', {
          description: desc, brightness: features.brightness,
          edge_density: features.edge_density, frame: state.frame_count,
        }, 0.4);
      }
    }

    // Publish to other nodes
    bus.emit(bus.chan('parietal_lobe'), bus.makeMsg(NODE, 'parietal_lobe', 'signal', {
      brightness: features.brightness, edge_density: features.edge_density,
    }));
    bus.emit(bus.chan('temporal_lobe'), bus.makeMsg(NODE, 'temporal_lobe', 'signal', {
      brightness: features.brightness,
    }));
    bus.emit(bus.chan('cerebellum'), bus.makeMsg(NODE, 'cerebellum', 'signal', {
      frame_b64: base64, scene: features.scene, brightness: features.brightness,
    }));
    bus.emit(bus.THALAMUS, bus.makeMsg(NODE, 'thalamus', 'signal', {
      frame_count: state.frame_count, scene: state.scene_description,
    }));
  } catch {
    state.sim_ok = false;
  }
}

export function init() {
  timer = setInterval(cameraLoop, CAM_INTERVAL);
  console.log(`[${NODE}] Camera polling started (${CAM_INTERVAL / 1000}s, sim: ${SIM_URL})`);
}

export function getState() {
  return {
    frame_count: state.frame_count, brightness: state.brightness,
    edge_density: state.edge_density, scene_description: state.scene_description,
    sim_ok: state.sim_ok,
  };
}

export const isReady = true;
export function destroy() { clearInterval(timer); }
export default { init, getState, isReady, destroy, setLlm };
