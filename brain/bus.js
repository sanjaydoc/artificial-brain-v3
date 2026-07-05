/**
 * Artificial Brain v3 — Message Bus
 * In-process EventEmitter replacing Redis pub/sub.
 * Same message shape: {from, to, type, payload, ts}
 */
import { EventEmitter } from 'events';

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

export const THALAMUS = 'brain:thalamus';

export function chan(nodeName) {
  return `brain:${nodeName}`;
}

export function makeMsg(from, to, type, payload = {}) {
  return { from, to, type, payload, ts: Date.now() / 1000 };
}

export function emit(channel, msg) {
  emitter.emit(channel, msg);
}

export function on(channel, handler) {
  emitter.on(channel, handler);
}

export function off(channel, handler) {
  emitter.off(channel, handler);
}

export default { THALAMUS, chan, makeMsg, emit, on, off };
