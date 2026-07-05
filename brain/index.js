/**
 * Artificial Brain v3 — Brain Orchestrator
 * Boots all 14 modules, wires bus subscriptions, exposes unified API.
 */
import bus from './bus.js';
import mem from './memory.js';
import config from './config.js';

// 14 brain modules
import thalamus from './thalamus.js';
import brainstem from './brainstem.js';
import amygdala from './amygdala.js';
import basalGanglia from './basalGanglia.js';
import cingulate from './cingulate.js';
import parietalLobe from './parietalLobe.js';
import insula from './insula.js';
import cerebellum from './cerebellum.js';
import hippocampus from './hippocampus.js';
import temporalLobe from './temporalLobe.js';
import wernicke from './wernicke.js';
import prefrontal from './prefrontal.js';
import broca from './broca.js';
import visualCortex from './visualCortex.js';

const modules = {
  thalamus, brainstem, amygdala, basalGanglia, cingulate,
  parietalLobe, insula, cerebellum, hippocampus, temporalLobe,
  wernicke, prefrontal, broca, visualCortex,
};

export async function init(llmService) {
  console.log('\n[brain] ══════════════════════════════════════════');
  console.log('[brain] Artificial Brain v3 — Booting 14 modules');
  console.log('[brain] ══════════════════════════════════════════\n');

  // Connect Neo4j
  const neoUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const neoUser = process.env.NEO4J_USER || 'neo4j';
  const neoPass = process.env.NEO4J_PASSWORD || 'brain_password';
  await mem.connect(neoUri, neoUser, neoPass);

  // Wire LLM into nodes that need it
  if (llmService) {
    wernicke.setLlm(llmService);
    prefrontal.setLlm(llmService);
    broca.setLlm(llmService);
    visualCortex.setLlm(llmService);
  }

  // Wire cross-node references for RAG
  prefrontal.setTemporalLobe(temporalLobe);
  prefrontal.setHippocampus(hippocampus);

  // Wire insula with all modules for health checking
  insula.setBrainModules(modules);

  // Boot all modules (order matters: infrastructure first, then nodes)
  // Phase 1: Router + heartbeat
  thalamus.init();
  brainstem.init();

  // Phase 2: Simple nodes (no LLM)
  amygdala.init();
  basalGanglia.init();
  cingulate.init();
  parietalLobe.init();
  insula.init();
  cerebellum.init();
  hippocampus.init();
  temporalLobe.init();

  // Phase 3: LLM-dependent nodes
  await wernicke.init();
  prefrontal.init();
  broca.init();
  visualCortex.init();

  console.log('\n[brain] ══════════════════════════════════════════');
  console.log('[brain] All 14 modules initialized');
  console.log(`[brain] Neo4j: ${mem.isConnected() ? 'connected' : 'disconnected'}`);
  console.log(`[brain] LLM: ${llmService ? 'available' : 'fallback mode'}`);
  console.log('[brain] ══════════════════════════════════════════\n');
}

export function getState() {
  const state = {};
  for (const [name, mod] of Object.entries(modules)) {
    state[name] = mod.getState();
  }
  return state;
}

export function getSignalLog() {
  return thalamus.getState().signal_log || [];
}

export function getActiveNodes() {
  return thalamus.getState().active_nodes || [];
}

export function injectSignal(from, to, type, payload) {
  const msg = bus.makeMsg(from, to, type, payload);
  if (to === 'thalamus' || to === 'broadcast') {
    bus.emit(bus.THALAMUS, msg);
  } else {
    bus.emit(bus.chan(to), msg);
  }
}

export function setStateCallback(fn) {
  thalamus.setStateCallback(fn);
}

export async function destroy() {
  for (const mod of Object.values(modules)) {
    if (mod.destroy) mod.destroy();
  }
  await mem.close();
  console.log('[brain] All modules destroyed');
}

// Re-export submodules for direct access
export { bus, mem as memory, config, broca, wernicke, hippocampus, temporalLobe, prefrontal };

export default {
  init, getState, getSignalLog, getActiveNodes,
  injectSignal, setStateCallback, destroy,
  bus, memory: mem, config, broca, wernicke, hippocampus, temporalLobe, prefrontal,
};
