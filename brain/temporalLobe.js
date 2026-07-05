/**
 * Node 08 — Temporal Lobe: Knowledge graph (Neo4j)
 * Learn/recall concept-relation-target facts.
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'temporal_lobe';
const state = { fact_count: 0, last_query: null, last_learned: null, signal_count: 0 };

async function onSignal(msg) {
  state.signal_count++;
  const p = msg.payload || {};

  if (msg.type === 'learn' || (p.concept && p.relation && p.target)) {
    const { concept, relation, target } = p;
    if (concept && relation && target) {
      await mem.learnFact(concept, relation, target);
      state.fact_count++;
      state.last_learned = `${concept} ${relation} ${target}`;

      mem.writeMemory(NODE, 'fact_learned', { concept, relation, target }, 0.5);
    }
  }

  if (msg.type === 'recall' && p.concept) {
    state.last_query = p.concept;
    const facts = await mem.recallConcept(p.concept, 5);
    bus.emit(bus.chan('prefrontal'), bus.makeMsg(NODE, 'prefrontal', 'signal', {
      knowledge: facts, concept: p.concept,
    }));
  }

  // Visual signals: learn brightness as fact
  if (p.brightness !== undefined) {
    const scene = p.brightness > 0.5 ? 'bright_scene' : 'dark_scene';
    await mem.learnFact('visual_input', 'is', scene);
    state.fact_count++;
  }
}

export async function learnFact(concept, relation, target) {
  return mem.learnFact(concept, relation, target);
}

export async function recallConcept(concept, limit = 5) {
  return mem.recallConcept(concept, limit);
}

export function init() {
  bus.on(bus.chan(NODE), onSignal);
  console.log(`[${NODE}] Knowledge graph ready`);
}

export function getState() { return { ...state }; }
export const isReady = true;
export function destroy() { bus.off(bus.chan(NODE), onSignal); }
export default { init, getState, isReady, destroy, learnFact, recallConcept };
