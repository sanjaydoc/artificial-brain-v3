#!/usr/bin/env node
/**
 * Artificial Brain v3 — Local Agent (Node.js)
 * Run this on YOUR machine to give the Brain access to your filesystem.
 *
 * Usage:
 *   node agent.js --url ws://localhost:8095/agent-ws --token YOUR_TOKEN
 *
 * The Brain will ask for permission before EVERY tool action.
 * Type  y  to allow,  n  to deny.  Ctrl-C to disconnect.
 */
import WebSocket from 'ws';
import os from 'os';
import { TOOL_MAP, isAsync } from './tools.js';
import { undo, history as undoHistory } from './undo.js';
import { askPermission } from './permissions.js';

// ── Colour helpers ──────────────────────────────────────────────────────────
const CYAN = '\x1b[96m';
const YELLOW = '\x1b[93m';
const GREEN = '\x1b[92m';
const RED = '\x1b[91m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const c = (col, text) => `${col}${text}${RESET}`;

// ── Parse CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let serverUrl = `ws://localhost:${process.env.PORT || '3003'}/agent-ws`;
let token = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) serverUrl = args[++i];
  else if (args[i] === '--server' && args[i + 1]) serverUrl = args[++i];
  else if (args[i] === '--token' && args[i + 1]) token = args[++i];
}

if (!token) {
  console.error(`${RED}Error: --token is required${RESET}`);
  console.log(`Usage: node agent.js --url ws://localhost:8095/agent-ws --token YOUR_TOKEN`);
  process.exit(1);
}

// ── Extended tool map (add undo/undo_history) ───────────────────────────────
const allTools = {
  ...TOOL_MAP,
  undo: () => undo(),
  undo_history: () => undoHistory(),
};

// ── Main agent loop ─────────────────────────────────────────────────────────
const HOME = os.homedir();
const RECONNECT_DELAY = 5000;

function connect() {
  const connectUrl = `${serverUrl}?token=${encodeURIComponent(token)}`;
  console.log(c(CYAN, `\n[agent] Connecting to ${serverUrl}…`));

  const ws = new WebSocket(connectUrl);
  let pingTimer = null;

  ws.on('open', () => {
    console.log(c(GREEN + BOLD, '[agent] Connected — waiting for Brain tool calls…'));
    console.log(c(DIM, `[agent] Token: ${token}`));
    console.log(c(DIM, `[agent] Home: ${HOME}`));
    console.log(c(DIM, '[agent] Press Ctrl-C to disconnect.\n'));

    // Keepalive every 15s
    pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    }, 15000);
  });

  ws.on('message', async (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    const mtype = msg.type;

    // Handle ping/pong
    if (mtype === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    if (mtype === 'pong') return;

    if (mtype === 'config_keys' && msg.keys) {
      for (const [k, v] of Object.entries(msg.keys)) {
        if (v) process.env[k.toUpperCase()] = v
      }
      console.log(c(GREEN, `  ✓ Received ${Object.keys(msg.keys).length} API keys from server`))
      return;
    }

    if (mtype !== 'tool_call') return;

    const callId = msg.id || '?';
    const tool = msg.tool || '';
    const toolArgs = msg.args || {};
    const autoApproved = msg.auto_approved || false;

    // Inject _env keys before tool execution
    const envBackup = {}
    if (msg._env && typeof msg._env === 'object') {
      for (const [k, v] of Object.entries(msg._env)) {
        envBackup[k] = process.env[k]
        process.env[k.toUpperCase()] = v
      }
    }

    const fn = allTools[tool];
    let result;

    if (!fn) {
      result = { ok: false, error: `unknown tool: ${tool}` };
    } else if (autoApproved) {
      // Permission was already granted in the chat UI
      console.log(c(GREEN, `  [UI-approved] ${tool}`));
      try {
        result = isAsync(tool) ? await fn(toolArgs) : fn(toolArgs);
      } catch (e) {
        result = { ok: false, error: e.message };
      }
    } else {
      // Ask permission in terminal
      const allowed = await askPermission(tool, toolArgs);
      if (allowed) {
        try {
          result = isAsync(tool) ? await fn(toolArgs) : fn(toolArgs);
        } catch (e) {
          result = { ok: false, error: e.message };
        }
      } else {
        result = { ok: false, error: 'user denied permission' };
      }
    }

    // Restore original env
    for (const [k, v] of Object.entries(envBackup)) {
      if (v === undefined) delete process.env[k.toUpperCase()]
      else process.env[k.toUpperCase()] = v
    }

    const response = JSON.stringify({
      type: 'tool_result',
      id: callId,
      result,
    });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(response);
    }
  });

  ws.on('close', (code, reason) => {
    clearInterval(pingTimer);
    console.log(c(YELLOW, `[agent] Connection closed (${code}), reconnecting in 5s…`));
    setTimeout(connect, RECONNECT_DELAY);
  });

  ws.on('error', (err) => {
    clearInterval(pingTimer);
    if (err.code === 'ECONNREFUSED') {
      console.log(c(RED, `[agent] Cannot connect (${err.message}), retrying in 5s…`));
    } else {
      console.log(c(RED, `[agent] Error: ${err.message}, retrying in 5s…`));
    }
    // Close triggers reconnect
    try { ws.close(); } catch {}
  });
}

// ── Entry point ─────────────────────────────────────────────────────────────
console.log(c(BOLD + CYAN, '  Artificial Brain v3 — Local Agent (Node.js)'));
console.log(c(DIM, `  Home directory: ${HOME}`));
console.log(c(DIM, `  Tools: ${Object.keys(allTools).length} total`));

// Handle Ctrl-C
process.on('SIGINT', () => {
  console.log(c(CYAN, '\n[agent] Disconnected.'));
  process.exit(0);
});

connect();
