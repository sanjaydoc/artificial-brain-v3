/**
 * Agent bridge — holds the sendToolCall function reference.
 * Avoids circular imports between server.js and routes/chat.js.
 */
let _sendToolCall = null;

export function setSendToolCall(fn) {
  _sendToolCall = fn;
}

export function sendToolCall(tool, args, autoApproved = false, token = '', env = {}) {
  if (!_sendToolCall) return Promise.resolve({ ok: false, error: 'no agent bridge configured' });
  return _sendToolCall(tool, args, autoApproved, token, env);
}
