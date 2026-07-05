// Artificial Brain v3 — Simulator proxy routes
import { Router } from 'express';

const router = Router();
const SIM_URL = process.env.SIM_TUNNEL_URL || 'https://sim.klabs.network';
const AUTH = process.env.TUNNEL_AUTH_TOKEN || '';

function headers(extra = {}) {
  const h = { ...extra };
  if (AUTH) h['X-Auth-Token'] = AUTH;
  return h;
}

// Proxy sim state
router.get('/state', async (req, res) => {
  try {
    const r = await fetch(`${SIM_URL}/state`, { headers: headers(), signal: AbortSignal.timeout(5000) });
    res.json(await r.json());
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// Proxy camera JPEG
router.get('/camera', async (req, res) => {
  try {
    const r = await fetch(`${SIM_URL}/camera`, { headers: headers(), signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(502).send('sim camera unavailable');
    res.set('Content-Type', 'image/jpeg');
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(502).send('sim camera unavailable');
  }
});

// Set motor program goal
router.post('/goal', async (req, res) => {
  try {
    const r = await fetch(`${SIM_URL}/goal`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(5000),
    });
    res.json(await r.json());
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// Trigger emotion overlay + reward to amygdala via brain bus
let injectSignal = null;
export function setSignalInjector(fn) { injectSignal = fn; }

const EMOTION_REWARDS = {
  anger: -2.5, contempt: -1.2, disgust: -2.0,
  happiness: 3.0, fear: -3.5, sadness: -2.0, surprise: 1.5,
};

router.post('/emotion', async (req, res) => {
  const { emotion } = req.body;
  if (!emotion || !EMOTION_REWARDS[emotion]) {
    return res.status(400).json({ error: 'invalid emotion', valid: Object.keys(EMOTION_REWARDS) });
  }
  try {
    // Trigger visual overlay in sim
    const simRes = await fetch(`${SIM_URL}/emotion`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ emotion }),
      signal: AbortSignal.timeout(5000),
    });
    const simData = await simRes.json();

    // Send reward to amygdala via brain bus
    const reward = EMOTION_REWARDS[emotion];
    if (injectSignal) {
      injectSignal('ui', 'amygdala', 'reward', { value: reward, source: `emotion:${emotion}` });
    }

    res.json({ ok: true, emotion, sim: simData, reward });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.delete('/emotion', async (req, res) => {
  try {
    const r = await fetch(`${SIM_URL}/emotion`, { method: 'DELETE', headers: headers(), signal: AbortSignal.timeout(5000) });
    res.json(await r.json());
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// Reset robot
router.post('/reset', async (req, res) => {
  try {
    const r = await fetch(`${SIM_URL}/reset`, { method: 'POST', headers: headers(), signal: AbortSignal.timeout(5000) });
    res.json(await r.json());
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

export default router;
