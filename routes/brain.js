// Artificial Brain v3 — Brain API routes
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Brain module reference — set by server.js after brain.init()
let brain = null;
export function setBrain(b) { brain = b; }

// ── State ───────────────────────────────────────────────────────────────────

router.get('/state', (req, res) => {
  if (!brain) return res.json({ error: 'brain not initialized' });
  res.json(brain.getState());
});

router.get('/signals', (req, res) => {
  if (!brain) return res.json([]);
  res.json(brain.getSignalLog());
});

router.get('/nodes/:name/state', (req, res) => {
  if (!brain) return res.json({ error: 'brain not initialized' });
  const all = brain.getState();
  const nodeState = all[req.params.name];
  if (!nodeState) return res.status(404).json({ error: `node '${req.params.name}' not found` });
  res.json(nodeState);
});

// ── Memory ──────────────────────────────────────────────────────────────────

router.get('/memory', async (req, res) => {
  const { node, limit = 20, term } = req.query;
  try {
    const memories = node
      ? await brain.memory.readMemory(node, Number(limit), term || null)
      : await brain.memory.readAllMemories(Number(limit));
    res.json({ ok: true, memories, count: memories.length });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.get('/memory/stats', async (req, res) => {
  try {
    const stats = await brain.memory.getStats();
    res.json({ ok: true, stats });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.post('/reset', async (req, res) => {
  try {
    const deleted = await brain.memory.resetMemories();
    res.json({ ok: true, deleted });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.post('/format', requireAuth, requireAdmin, async (req, res) => {
  try {
    const deleted = await brain.memory.resetAll();
    res.json({ ok: true, deleted });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── Knowledge Graph ─────────────────────────────────────────────────────────

router.get('/knowledge/:concept', async (req, res) => {
  try {
    const facts = await brain.memory.recallConcept(req.params.concept, Number(req.query.limit || 10));
    res.json({ ok: true, concept: req.params.concept, facts });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.post('/learn', async (req, res) => {
  const { concept, relation, target } = req.body;
  if (!concept || !relation || !target) return res.status(400).json({ error: 'concept, relation, target required' });
  try {
    await brain.memory.learnFact(concept, relation, target);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── Signal Injection ────────────────────────────────────────────────────────

router.post('/signal', (req, res) => {
  const { from = 'api', to = 'thalamus', type = 'signal', payload = {} } = req.body;
  brain.injectSignal(from, to, type, payload);
  res.json({ ok: true });
});

// ── Config ──────────────────────────────────────────────────────────────────

router.get('/config', (req, res) => {
  const cfg = brain.config.getConfig();
  res.json({ ok: true, config: { ...cfg, presets: Object.fromEntries(brain.config.getPresetNames().map(n => [n, true])) } });
});

router.post('/config', (req, res) => {
  const { nodes, routes } = req.body;
  if (nodes) {
    for (const [name, cfg] of Object.entries(nodes)) {
      const enabled = typeof cfg === 'object' ? cfg.enabled !== false : cfg !== false;
      brain.config.setNodeEnabled(name, enabled);
    }
  }
  if (routes) {
    for (const [key, val] of Object.entries(routes)) {
      const [src, dst] = key.split('→');
      const enabled = typeof val === 'object' ? val.enabled !== false : val !== false;
      if (src && dst) brain.config.setRouteEnabled(src, dst, enabled);
      else brain.config.addRoute(key, enabled);
    }
  }
  const cfg = brain.config.getConfig();
  res.json({ ok: true, config: { ...cfg, presets: Object.fromEntries(brain.config.getPresetNames().map(n => [n, true])) } });
});

router.post('/config/preset', (req, res) => {
  const { name } = req.body;
  const ok = brain.config.applyPreset(name);
  if (!ok) return res.status(400).json({ error: `unknown preset: ${name}`, available: brain.config.getPresetNames() });
  res.json({ ok: true, preset: name, config: brain.config.getConfig() });
});

// ── Cerebellum RL ───────────────────────────────────────────────────────────

const RL_URL = process.env.RL_TUNNEL_URL || 'https://rl.klabs.network';
const AUTH = process.env.TUNNEL_AUTH_TOKEN || '';

router.get('/cerebellum/status', async (req, res) => {
  try {
    const headers = AUTH ? { 'X-Auth-Token': AUTH } : {};
    const r = await fetch(`${RL_URL}/status`, { headers, signal: AbortSignal.timeout(5000) });
    res.json(await r.json());
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.post('/cerebellum/start', async (req, res) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (AUTH) headers['X-Auth-Token'] = AUTH;
    const r = await fetch(`${RL_URL}/set_mode`, { method: 'POST', headers, body: JSON.stringify({ mode: 'sinusoidal' }) });
    res.json(await r.json());
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.post('/cerebellum/stop', async (req, res) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (AUTH) headers['X-Auth-Token'] = AUTH;
    const r = await fetch(`${RL_URL}/set_mode`, { method: 'POST', headers, body: JSON.stringify({ mode: 'stopped' }) });
    res.json(await r.json());
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

export default router;
