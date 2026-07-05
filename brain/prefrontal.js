/**
 * Node 01 — Prefrontal Cortex: LLM goal planning with RAG
 * Queries temporal lobe + hippocampus for context, then asks LLM for goal.
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'prefrontal';
const PLAN_INTERVAL = 45000; // 45s auto-plan

const FALLBACK_GOALS = [
  'observe environment', 'maintain balance', 'explore forward',
  'avoid obstacles', 'learn from experience', 'rest and consolidate',
];

let llm = null;
let temporalLobe = null;
let hippocampus = null;
let timer = null;
let goalIndex = 0;

const state = {
  current_goal: 'observe environment', plan_step: 0, confidence: 0.5,
  signal_count: 0, emotion: 'neutral',
  world_model: { reward: 0, stable: true, position: [0, 0, 0.79], brightness: 0.5 },
};

export function setLlm(l) { llm = l; }
export function setTemporalLobe(tl) { temporalLobe = tl; }
export function setHippocampus(h) { hippocampus = h; }

async function fetchRagContext(goal) {
  let ragText = '';

  // Knowledge graph facts from temporal lobe
  if (temporalLobe) {
    try {
      const concept = (goal || '').split(' ')[0] || 'environment';
      const facts = await temporalLobe.recallConcept(concept, 3);
      if (facts.length > 0) {
        ragText += 'Knowledge graph: ' + facts.map(f => `${concept} ${f.relation} ${f.target}`).join(', ') + '. ';
      }
    } catch {}
  }

  // Recent episodes from hippocampus
  if (hippocampus) {
    try {
      const episodes = await hippocampus.recall(3);
      if (episodes.length > 0) {
        ragText += 'Recent episodes: ' + episodes.map(e => {
          try { const c = JSON.parse(e.content); return `${c.action || '?'}→reward:${c.reward || '?'}`; }
          catch { return e.content?.slice(0, 60) || ''; }
        }).join(', ') + '.';
      }
    } catch {}
  }

  return ragText;
}

async function llmPlan() {
  if (!llm) return ruleBased();

  try {
    const rag = await fetchRagContext(state.current_goal);
    const prompt = `You are a robot brain's prefrontal cortex. Based on the current state, pick the best goal.

World state: reward=${state.world_model.reward}, stable=${state.world_model.stable}, emotion=${state.emotion}
${rag ? `Past experience: ${rag}` : ''}

Available goals: ${FALLBACK_GOALS.join(', ')}

Reply ONLY with JSON: {"goal": "...", "reason": "...", "confidence": 0.0-1.0}`;

    const reply = await llm.chat([{ role: 'user', content: prompt }], {
      role: 'reasoning', maxTokens: 80, temperature: 0.3,
    });

    // Parse JSON from reply
    const jsonMatch = reply.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.goal && FALLBACK_GOALS.includes(parsed.goal)) {
        state.current_goal = parsed.goal;
        state.confidence = parsed.confidence || 0.7;
        state.plan_step++;

        mem.writeMemory(NODE, 'goal_decision', {
          goal: parsed.goal, reason: parsed.reason,
          confidence: state.confidence, emotion: state.emotion, plan_step: state.plan_step,
        }, state.confidence);

        return parsed;
      }
    }
  } catch {}

  return ruleBased();
}

function ruleBased() {
  goalIndex = (goalIndex + 1) % FALLBACK_GOALS.length;
  state.current_goal = FALLBACK_GOALS[goalIndex];
  state.confidence = 0.3;
  state.plan_step++;
  return { goal: state.current_goal, reason: 'rule-based cycling', confidence: 0.3 };
}

async function autoPlanLoop() {
  const result = await llmPlan();

  // Publish goal to cerebellum, broca, cingulate
  bus.emit(bus.chan('cerebellum'), bus.makeMsg(NODE, 'cerebellum', 'signal', {
    goal: state.current_goal, confidence: state.confidence,
  }));
  bus.emit(bus.chan('broca'), bus.makeMsg(NODE, 'broca', 'signal', {
    goal: state.current_goal, reasoning: result.reason, emotion: state.emotion,
  }));
  bus.emit(bus.chan('cingulate'), bus.makeMsg(NODE, 'cingulate', 'signal', {
    goal: state.current_goal,
  }));
}

function onSignal(msg) {
  state.signal_count++;
  const p = msg.payload || {};

  // World model updates
  if (p.world_model) Object.assign(state.world_model, p.world_model);
  if (p.reward !== undefined) state.world_model.reward = p.reward;
  if (p.stable !== undefined) state.world_model.stable = p.stable;

  // Emotion updates
  if (p.emotion) state.emotion = p.emotion;
  if (p.valence !== undefined) state.emotion = p.emotion || state.emotion;

  // Intent from wernicke
  if (p.intent) state.world_model.intent = p.intent;
  if (p.raw_text) state.world_model.last_input = p.raw_text;

  // Habit boost from basal ganglia
  if (msg.type === 'habit_boost') {
    state.world_model.habit = p.best_habit;
    state.world_model.habit_strength = p.strength || 0;
  }

  // Conflict alert from cingulate
  if (msg.type === 'conflict_alert') {
    state.world_model.conflict = p.conflict || '';
    state.world_model.resolution = p.resolution || '';
  }

  // Knowledge from temporal lobe
  if (p.knowledge) state.world_model.knowledge = p.knowledge;
}

export function init() {
  bus.on(bus.chan(NODE), onSignal);
  timer = setInterval(autoPlanLoop, PLAN_INTERVAL);
  // First plan after 5s (let other nodes init)
  setTimeout(autoPlanLoop, 5000);
  console.log(`[${NODE}] Goal planner ready (${PLAN_INTERVAL / 1000}s auto-plan, LLM: ${llm ? 'yes' : 'fallback'})`);
}

export function getState() { return { ...state, world_model: { ...state.world_model } }; }
export const isReady = true;
export function destroy() {
  bus.off(bus.chan(NODE), onSignal);
  clearInterval(timer);
}
export default { init, getState, isReady, destroy, setLlm, setTemporalLobe, setHippocampus };
