// Artificial Brain v3 — LLM diagnostic routes
import { Router } from 'express';
import { chat, getLlmStatus } from '../services/llm.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json(getLlmStatus());
});

router.get('/probe', async (req, res) => {
  try {
    const t0 = Date.now();
    const reply = await chat([{ role: 'user', content: 'Say "ok" in one word.' }], {
      role: 'language', maxTokens: 10, temperature: 0,
    });
    res.json({ ok: true, reply, elapsedMs: Date.now() - t0 });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

export default router;
