/**
 * Node 06 — Wernicke's Area: Semantic intent parsing via embeddings
 * Pre-embeds 10 intent templates at startup, matches by cosine similarity.
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'wernicke';

// 10 intent templates
const INTENT_TEMPLATES = {
  move_forward:    'walk forward go ahead move straight explore',
  stop:            'stop halt freeze pause wait hold',
  observe:         'look observe watch see scan check environment',
  recall_memory:   'remember recall memory what happened past',
  learn:           'learn study remember this save note',
  turn:            'turn rotate spin left right around',
  greet:           'hello hi hey greetings wave',
  status:          'status how are you health state condition',
  reward_positive: 'good great well done excellent reward positive',
  reward_negative: 'bad wrong stop negative punishment fail',
};

const INTENT_MAP = {
  move_forward:    { action: 'move',    target: 'forward', modifier: 'steady' },
  stop:            { action: 'stop',    target: 'self',    modifier: 'immediate' },
  observe:         { action: 'observe', target: 'environment', modifier: 'wide' },
  recall_memory:   { action: 'recall',  target: 'memory',  modifier: 'recent' },
  learn:           { action: 'learn',   target: 'input',   modifier: 'store' },
  turn:            { action: 'turn',    target: 'self',    modifier: 'slow' },
  greet:           { action: 'greet',   target: 'user',    modifier: 'friendly' },
  status:          { action: 'status',  target: 'self',    modifier: 'report' },
  reward_positive: { action: 'reward',  target: 'self',    modifier: '+1' },
  reward_negative: { action: 'reward',  target: 'self',    modifier: '-1' },
};

let intentVecs = {}; // {intent: number[]}
let llm = null; // Set by orchestrator
const state = { last_input: null, last_intent: null, last_confidence: 0, parse_count: 0, intents_loaded: 0 };

export function setLlm(llmService) { llm = llmService; }

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

async function precomputeIntents() {
  if (!llm) return;
  for (const [intent, text] of Object.entries(INTENT_TEMPLATES)) {
    try {
      const vec = await llm.embed(text);
      if (vec && vec.length > 0) {
        intentVecs[intent] = vec;
        state.intents_loaded++;
      }
    } catch {}
  }
  console.log(`[${NODE}] Pre-embedded ${state.intents_loaded}/10 intent templates`);
}

// Keyword fallback
function keywordMatch(text) {
  const lower = text.toLowerCase();
  for (const [intent, template] of Object.entries(INTENT_TEMPLATES)) {
    const words = template.split(' ');
    for (const w of words) {
      if (lower.includes(w)) return { intent, confidence: 0.5 };
    }
  }
  return { intent: 'observe', confidence: 0.2 };
}

export async function parse(text) {
  state.parse_count++;
  state.last_input = text;

  // Try embedding-based matching
  if (llm && state.intents_loaded > 0) {
    try {
      const queryVec = await llm.embed(text);
      if (queryVec && queryVec.length > 0) {
        let bestIntent = 'observe', bestScore = -1;
        for (const [intent, vec] of Object.entries(intentVecs)) {
          const score = cosineSimilarity(queryVec, vec);
          if (score > bestScore) { bestScore = score; bestIntent = intent; }
        }
        state.last_intent = bestIntent;
        state.last_confidence = bestScore;

        const mapped = INTENT_MAP[bestIntent] || { action: bestIntent, target: 'unknown', modifier: '' };
        return { ...mapped, intent: bestIntent, raw: text, confidence: bestScore };
      }
    } catch {}
  }

  // Fallback to keywords
  const { intent, confidence } = keywordMatch(text);
  state.last_intent = intent;
  state.last_confidence = confidence;
  const mapped = INTENT_MAP[intent] || { action: intent, target: 'unknown', modifier: '' };
  return { ...mapped, intent, raw: text, confidence };
}

async function onSignal(msg) {
  const p = msg.payload || {};
  const text = p.text || p.raw || '';
  if (!text) return;

  const result = await parse(text);

  if (result.confidence > 0.6) {
    mem.writeMemory(NODE, 'intent_parsed', {
      text, action: result.action, confidence: result.confidence,
    }, result.confidence);
  }

  // Publish to prefrontal
  bus.emit(bus.chan('prefrontal'), bus.makeMsg(NODE, 'prefrontal', 'signal', {
    intent: result.intent, raw_text: text, confidence: result.confidence,
    action: result.action, target: result.target, modifier: result.modifier,
  }));

  // Reward intents → amygdala + basal_ganglia
  if (result.intent === 'reward_positive') {
    bus.emit(bus.chan('amygdala'), bus.makeMsg(NODE, 'amygdala', 'reward', { value: 1.0, source: 'user_positive' }));
    bus.emit(bus.chan('basal_ganglia'), bus.makeMsg(NODE, 'basal_ganglia', 'signal', { reward: 1.0, action: 'user_reward' }));
  } else if (result.intent === 'reward_negative') {
    bus.emit(bus.chan('amygdala'), bus.makeMsg(NODE, 'amygdala', 'reward', { value: -1.0, source: 'user_negative' }));
    bus.emit(bus.chan('basal_ganglia'), bus.makeMsg(NODE, 'basal_ganglia', 'signal', { reward: -1.0, action: 'user_penalty' }));
  }
}

export async function init() {
  bus.on(bus.chan(NODE), onSignal);
  // Delay intent pre-computation to allow LLM to initialize
  setTimeout(() => precomputeIntents(), 5000);
  console.log(`[${NODE}] Intent parser ready (embedding-based + keyword fallback)`);
}

export function getState() { return { ...state }; }
export const isReady = true;
export function destroy() { bus.off(bus.chan(NODE), onSignal); }
export default { init, getState, isReady, destroy, parse, setLlm };
