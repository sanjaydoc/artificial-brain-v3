/**
 * Node 03 — Amygdala: Emotional state & reward signal processing
 * Valence/arousal exponential moving average → 6 emotion labels.
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'amygdala';
const state = {
  valence: 0, arousal: 0, emotion: 'neutral',
  signal_count: 0, last_trigger: null,
};
let prevEmotion = 'neutral';

function classify(v, a) {
  if (v > 0.3 && a > 0.5) return 'excited';
  if (v > 0.3 && a <= 0.5) return 'calm';
  if (v < -0.3 && a > 0.5) return 'fearful';
  if (v < -0.3 && a <= 0.5) return 'sad';
  if (a > 0.5) return 'alert';
  return 'neutral';
}

function onSignal(msg) {
  state.signal_count++;
  const p = msg.payload || {};

  if (msg.type === 'reward' && p.value !== undefined) {
    const reward = Number(p.value);
    state.valence = Math.max(-1, Math.min(1, state.valence * 0.9 + reward * 0.1));
    state.arousal = Math.max(0, Math.min(1, state.arousal * 0.9 + Math.abs(reward) * 0.1));
    state.last_trigger = p.source || 'unknown';
  } else {
    state.arousal = Math.max(0, Math.min(1, state.arousal * 0.9 + 0.02));
  }

  state.emotion = classify(state.valence, state.arousal);

  // Write memory on emotion change
  if (state.emotion !== prevEmotion) {
    prevEmotion = state.emotion;
    mem.writeMemory(NODE, 'emotion_change', {
      emotion: state.emotion, valence: state.valence,
      arousal: state.arousal, trigger: state.last_trigger,
    }, Math.abs(state.valence));
  }

  // Every 100 signals: snapshot
  if (state.signal_count % 100 === 0) {
    mem.writeMemory(NODE, 'valence_snapshot', {
      emotion: state.emotion, valence: state.valence,
      arousal: state.arousal, signal_count: state.signal_count,
    }, 0.3);
  }

  // Publish emotion to thalamus, prefrontal, broca
  const emotionPayload = {
    valence: state.valence, arousal: state.arousal, emotion: state.emotion,
  };
  bus.emit(bus.THALAMUS, bus.makeMsg(NODE, 'thalamus', 'signal', emotionPayload));
  bus.emit(bus.chan('prefrontal'), bus.makeMsg(NODE, 'prefrontal', 'signal', emotionPayload));
  bus.emit(bus.chan('broca'), bus.makeMsg(NODE, 'broca', 'signal', emotionPayload));
}

export function init() {
  bus.on(bus.chan(NODE), onSignal);
  console.log(`[${NODE}] Emotion classifier ready`);
}

export function getState() { return { ...state }; }
export const isReady = true;
export function destroy() { bus.off(bus.chan(NODE), onSignal); }
export default { init, getState, isReady, destroy };
