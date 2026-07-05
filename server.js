// Artificial Brain v3 — Single Entry Point (SINGLE PORT)
// Serves React frontend + Brain API + Sub-apps APIs + WebSocket
// Everything on one port — cPanel compatible.
// Usage: node server.js

import './dns-fix.js';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Brain + services
import brain from './brain/index.js';
import * as llm from './services/llm.js';
import { getLlmStatus } from './services/llm.js';
import { setSendToolCall } from './services/agentBridge.js';

// Brain routes
import brainRoutes, { setBrain } from './routes/brain.js';
import chatRoutes, { setBrainModules } from './routes/chat.js';
import simRoutes, { setSignalInjector } from './routes/sim.js';
import llmRoutes from './routes/llm.js';
import authRoutes from './routes/auth.js';

// Sub-app routes (mounted in-process, no separate ports)
import bizUploadsRouter from './apps/businesses/routes/uploads.js';
import bizScrapeRouter from './apps/businesses/routes/scrape.js';
import bizGrowthRouter from './apps/businesses/routes/growth.js';
import bizChatRouter from './apps/businesses/routes/chat.js';
import { loadAgentConfig as bizLoadConfig } from './apps/businesses/services/agentConfig.js';

import isInventionsRouter from './apps/inventor-studio/routes/inventions.js';
import isDreamRouter from './apps/inventor-studio/routes/dream.js';
import isStreamRouter from './apps/inventor-studio/routes/stream.js';
import isChatRouter from './apps/inventor-studio/routes/chat.js';
import isVibeRouter from './apps/inventor-studio/routes/vibe.js';
import isElectronicsRouter from './apps/inventor-studio/routes/electronics.js';
import isAutonomousRouter from './apps/inventor-studio/routes/autonomous.js';
import isPublicRouter from './apps/inventor-studio/routes/public.js';
import isAuthRouter from './apps/inventor-studio/routes/auth.js';
import isAdminRouter from './apps/inventor-studio/routes/admin.js';
import isSubscriptionRouter from './apps/inventor-studio/routes/subscription.js';
import genesisRouter, { setBroadcastKeys } from './routes/genesis.js';
import { loadGlobalKeys, getGlobalKeys } from './services/genesisExecutor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3003);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const app = express();

// Load sub-app env files
dotenv.config({ path: path.resolve(__dirname, 'apps/businesses/.env'), override: false });
dotenv.config({ path: path.resolve(__dirname, 'apps/inventor-studio/.env'), override: false });

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    version: 'v3',
    node: process.version,
    uptime: Math.round(process.uptime()),
    env: process.env.NODE_ENV || 'development',
  });
});

// ── Mount routes ────────────────────────────────────────────────────────────
app.use('/api/brain', brainRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sim', simRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/auth', withDb, authRoutes);
app.use('/api/input', chatRoutes);          // POST /api/input → wernicke parse
app.use('/api/cerebellum', brainRoutes);    // GET/POST /api/cerebellum/*

// ── MongoDB ─────────────────────────────────────────────────────────────────
// Both sub-apps use the same default mongoose connection.
// We connect to the businesses cluster. Inventor-studio models store
// in the same cluster under different collection names (no collision).
// If inventor-studio needs its own cluster later, use mongoose.createConnection().

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.warn('[server] No MONGODB_URI — sub-app APIs disabled'); return; }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 45000, family: 4 });
    console.log(`[server] MongoDB connected → ${mongoose.connection.name}`);
  } catch (err) {
    console.error('[server] MongoDB failed:', err.message);
  }
}

function withDb(_req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  res.status(503).json({ error: 'Database unavailable' });
}

// ── Sub-app APIs (mounted in-process, single port) ──────────────────────────
// Frontend uses baseURL="/businesses/api" + .post("/growth") → /businesses/api/growth
app.use('/businesses/api/uploads', withDb, bizUploadsRouter);
app.use('/businesses/api/scrape', withDb, bizScrapeRouter);
app.use('/businesses/api/growth', withDb, bizGrowthRouter);
app.use('/businesses/api/chat', withDb, bizChatRouter);
app.get('/businesses/api/health', (_req, res) => res.json({ ok: true, app: 'businesses' }));

// Inventor Studio API (uses its own MongoDB connection via db.js — Cluster0)
app.use('/inventor-studio/api/inventions', isInventionsRouter);
app.use('/inventor-studio/api/dream', isDreamRouter);
app.use('/inventor-studio/api/stream', isStreamRouter);
app.use('/inventor-studio/api/chat', isChatRouter);
app.use('/inventor-studio/api/vibe', isVibeRouter);
app.use('/inventor-studio/api/electronics', isElectronicsRouter);
app.use('/inventor-studio/api/autonomous', isAutonomousRouter);
app.use('/inventor-studio/api/public', isPublicRouter);
app.use('/inventor-studio/api/auth', withDb, isAuthRouter);
app.use('/inventor-studio/api/admin', withDb, isAdminRouter);
app.use('/inventor-studio/api/subscription', withDb, isSubscriptionRouter);
app.get('/inventor-studio/api/health', (_req, res) => res.json({ ok: true, app: 'inventor-studio' }));
app.get('/inventor-studio/api/llm/status', (_req, res) => res.json(getLlmStatus()));
app.get('/inventor-studio/api/llm/probe', async (_req, res) => {
  try { const r = await llm.chat([{ role: 'user', content: 'hi' }], 'language', { maxTokens: 1 }); res.json({ ok: r.ok, provider: r.provider, model: r.model, ms: r.elapsedMs }); }
  catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── Genesis Chamber API ──
app.use('/genesis/api', genesisRouter);
app.get('/genesis/api/health', (_req, res) => res.json({ ok: true, app: 'genesis' }));

// ── Agent status + Working directory ────────────────────────────────────────
let currentWorkdir = '';

app.get('/api/agent/status', (req, res) => {
  const token = req.query.token || '';
  if (token && agentConnections.has(token)) {
    const ws = agentConnections.get(token);
    res.json({ connected: ws.readyState === 1 });
  } else {
    res.json({ connected: agentConnections.size > 0 });
  }
});

app.get('/api/workdir', (_req, res) => {
  res.json({ ok: true, workdir: currentWorkdir });
});

app.post('/api/workdir', (req, res) => {
  const p = String(req.body?.path || '').trim();
  currentWorkdir = p;
  app.locals.currentWorkdir = p;
  res.json({ ok: true, workdir: currentWorkdir });
});

// ── Sub-apps (serve pre-built SPAs) ─────────────────────────────────────────
const publicDir = path.join(__dirname, 'public');
app.use('/businesses', express.static(path.join(publicDir, 'businesses')));
app.use('/inventor-studio', express.static(path.join(publicDir, 'inventor-studio')));
app.use('/genesis', express.static(path.join(publicDir, 'genesis')));

// SPA fallback for sub-apps
app.get('/businesses/*', (req, res) => {
  if (req.path.startsWith('/businesses/api/')) return res.status(404).json({ error: 'not found' });
  const idx = path.join(publicDir, 'businesses', 'index.html');
  res.sendFile(idx, (err) => { if (err) res.status(404).send('Businesses app not found'); });
});
app.get('/inventor-studio/*', (req, res) => {
  if (req.path.startsWith('/inventor-studio/api/')) return res.status(404).json({ error: 'not found' });
  const idx = path.join(publicDir, 'inventor-studio', 'index.html');
  res.sendFile(idx, (err) => { if (err) res.status(404).send('Inventor Studio app not found'); });
});
app.get('/genesis/*', (req, res) => {
  if (req.path.startsWith('/genesis/api/')) return res.status(404).json({ error: 'not found' });
  const idx = path.join(publicDir, 'genesis', 'index.html');
  res.sendFile(idx, (err) => { if (err) res.status(404).send('Genesis not built — run: cd apps/genesis && npx vite build --outDir ../../public/genesis'); });
});

// ── Serve React frontend (production) ───────────────────────────────────────
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) res.status(200).send('Artificial Brain v3 — run npm run build first');
  });
});

// ── HTTP + WebSocket server ─────────────────────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Browser clients (brain state push)
const browserClients = new Set();
const agentConnections = new Map(); // token → ws

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      browserClients.add(ws);
      ws.on('close', () => browserClients.delete(ws));
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data);
          // Handle permission responses from UI
          if (msg.type === 'permission_response') {
            // Resolve pending permission
          }
        } catch {}
      });
    });
  } else if (url.pathname === '/agent-ws') {
    const token = url.searchParams.get('token');
    if (!token) { socket.destroy(); return; }

    wss.handleUpgrade(req, socket, head, (ws) => {
      agentConnections.set(token, ws);
      console.log(`[server] Agent connected (token: ${token.slice(0, 8)}…)`);
      broadcastToUI({ type: 'agent_status', connected: true, token: token.slice(0, 8) });

      ws.on('close', () => {
        agentConnections.delete(token);
        console.log(`[server] Agent disconnected`);
        broadcastToUI({ type: 'agent_status', connected: false });
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'tool_result') {
            // Resolve pending tool call
            const resolver = pendingToolCalls.get(msg.id);
            if (resolver) {
              resolver(msg.result);
              pendingToolCalls.delete(msg.id);
            }
          }
          if (msg.type === 'pong') return; // Keepalive
        } catch {}
      });

      // Keepalive ping every 20s
      const pingTimer = setInterval(() => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 20000);
      ws.on('close', () => clearInterval(pingTimer));
    });
  } else {
    socket.destroy();
  }
});

// ── Tool call routing to agent ──────────────────────────────────────────────
const pendingToolCalls = new Map(); // id → resolve function
let callIdCounter = 0;

export function sendToolCall(tool, args, autoApproved = false, token = '', env = {}) {
  return new Promise((resolve) => {
    // Route to the agent connected with this specific token
    let agent = null;
    if (token && agentConnections.has(token)) {
      agent = agentConnections.get(token);
    }
    // Fallback: if no token-specific agent, check all (backward compat)
    if (!agent || agent.readyState !== 1) {
      agent = null;
      for (const [, ws] of agentConnections) {
        if (ws.readyState === 1) { agent = ws; break; }
      }
    }
    if (!agent) {
      return resolve({ ok: false, error: 'no agent connected — run the connect command from the Home page' });
    }

    const id = `tc_${++callIdCounter}`;
    pendingToolCalls.set(id, resolve);

    agent.send(JSON.stringify({ type: 'tool_call', id, tool, args, auto_approved: autoApproved, _env: env || {} }));

    // Timeout after 60s
    setTimeout(() => {
      if (pendingToolCalls.has(id)) {
        pendingToolCalls.delete(id);
        resolve({ ok: false, error: 'tool call timed out (60s)' });
      }
    }, 60000);
  });
}

// Wire the bridge so routes/chat.js can call sendToolCall without circular imports
setSendToolCall(sendToolCall);

setBroadcastKeys(async (userId) => {
  try {
    await loadGlobalKeys(userId)
    const keys = getGlobalKeys()
    for (const [, ws] of agentConnections) {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'config_keys', keys }))
      }
    }
  } catch {}
});

// ── Broadcast brain state to browser clients ────────────────────────────────
function broadcastToUI(data) {
  const msg = JSON.stringify(data);
  for (const ws of browserClients) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

// Brain state push every 2s
setInterval(() => {
  if (browserClients.size === 0) return;
  broadcastToUI({
    type: 'brain_state',
    ...brain.getState(),
    signal_log: brain.getSignalLog(),
    active_nodes: brain.getActiveNodes(),
    agent_connected: agentConnections.size > 0,
  });
}, 2000);

// ── Boot brain ──────────────────────────────────────────────────────────────
async function seedAdmin() {
  const { User } = await import('./models/User.js');
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw) return;
  const exists = await User.findOne({ email });
  if (exists) { console.log('[server] Admin account exists'); return; }
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.default.hash(pw, 12);
  await User.create({ email, passwordHash: hash, role: 'Admin', passwordLoginEnabled: true });
  console.log(`[server] Admin seeded: ${email}`);
}

async function boot() {
  // Connect MongoDB for sub-apps
  await connectMongo();

  // Seed admin account
  await seedAdmin();

  // Load global API keys from MongoDB
  try { await loadGlobalKeys(); } catch {}

  // Wire brain modules to routes
  await brain.init(llm);
  setBrain(brain);
  setBrainModules({ broca: brain.broca, wernicke: brain.wernicke });
  setSignalInjector((from, to, type, payload) => brain.injectSignal(from, to, type, payload));

  // Push brain state updates to WS clients
  brain.setStateCallback((state) => broadcastToUI({ type: 'brain_state', ...state }));

  server.listen(PORT, () => {
    console.log(`\n[server] ══════════════════════════════════════════`);
    console.log(`[server] Artificial Brain v3 running on port ${PORT}`);
    console.log(`[server] API:      http://localhost:${PORT}/api/health`);
    console.log(`[server] UI:       http://localhost:${PORT}`);
    console.log(`[server] Client:   ${CLIENT_URL} (dev mode)`);
    console.log(`[server] WS:       ws://localhost:${PORT}/ws`);
    console.log(`[server] Agent WS: ws://localhost:${PORT}/agent-ws`);
    console.log(`[server] LLM:      ${getLlmStatus().activeOrder.join(' → ') || 'none configured'}`);
    console.log(`[server] ══════════════════════════════════════════\n`);
  });
}

boot().catch((err) => {
  console.error('[server] Fatal error during boot:', err);
  process.exit(1);
});
