// Shim that mirrors ASI-1's reasoningLLM/agentLLM/embedText API
// using the v3 multi-provider chat() service.
//
// ASI-1 agents call: reasoningLLM.invoke(prompt, maxTokens) etc.
// We translate that into chat([{role:'user', content:prompt}], {role,maxTokens,jsonMode}).

import { chat, embed } from '../llm.js'

const stripThink = (s) => String(s || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()

const toMsgs = (prompt) => [{ role: 'user', content: String(prompt || '') }]

async function callChat(prompt, opts) {
  const r = await chat(toMsgs(prompt), opts)
  return stripThink(r.content || '')
}

export const reasoningLLM = {
  invoke: (prompt, maxTokens = 500) =>
    callChat(prompt, { role: 'reasoning', maxTokens, temperature: 0.7 }),
  invokeJson: (prompt, maxTokens = 500) =>
    callChat(prompt, { role: 'reasoning', maxTokens, temperature: 0.4, jsonMode: true }),
}

export const agentLLM = {
  invoke: (prompt, maxTokens = 200) =>
    callChat(prompt, { role: 'agent', maxTokens, temperature: 0.9 }),
  invokeJson: (prompt, maxTokens = 800) =>
    callChat(prompt, { role: 'agent', maxTokens, temperature: 0.3, jsonMode: true }),
}

// Cell therapy / clinical reasoning — routes to 'bio' tier (meditron:7b locally).
// Cloud tiers still use llama-3.3-70b (no cloud bio specialty in OpenRouter free).
export const bioMistralLLM = {
  invoke: (prompt, maxTokens = 1000) =>
    callChat(prompt, { role: 'bio', maxTokens, temperature: 0.7 }),
  invokeJson: (prompt, maxTokens = 1200) =>
    callChat(prompt, { role: 'bio', maxTokens, temperature: 0.3, jsonMode: true }),
}

// Vibe Coding — routes to 'coder' tier. Cloud uses Kimi K2 (128k ctx),
// local uses qwen2.5-coder:1.5b (small + fast + code-specialized).
export const coderLLM = {
  invoke: (prompt, maxTokens = 4000) =>
    callChat(prompt, { role: 'coder', maxTokens, temperature: 0.3 }),
}

// Long-context tasks (Kimi was the original intent — kept for the name, but
// any 128k+ context model in 'coder' tier works). Free tier kimi has 128k ctx.
export const kimiLLM = {
  invoke: (prompt, maxTokens = 2000) =>
    callChat(prompt, { role: 'coder', maxTokens, temperature: 0.7 }),
}

export async function embedText(text) {
  try {
    const r = await embed(String(text || '').slice(0, 8000))
    return r.embeddings[0] || []
  } catch (err) {
    console.warn('[embedText] failed:', err.message)
    return []
  }
}
