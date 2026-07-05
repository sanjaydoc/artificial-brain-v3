// Dream lens agents — each takes a concept + retrieved context and returns 2-3
// paragraphs framed through one creative lens. Ported from ASI-1 dreamAgents.ts.

import { agentLLM } from '../utils/llmAdapter.js'

function buildPrompt(lens, instruction, concept, context) {
  return `You are a ${lens} Invention Agent.\n\n${instruction}\n\nCONCEPT: ${concept}\n\nPRIOR KNOWLEDGE:\n${context}\n\nOutput only your invention idea (2-3 paragraphs).`
}

export const analogicalAgent = (concept, ctx) =>
  agentLLM.invoke(
    buildPrompt(
      'Analogical',
      'Your lens: find how NATURE or other fields already solve a similar problem, then apply that solution. Find 2-3 analogies from biology or unrelated fields, extract the core mechanism, apply it to invent something new.',
      concept, ctx,
    ),
  )

export const inversionAgent = (concept, ctx) =>
  agentLLM.invoke(
    buildPrompt(
      'Inversion',
      'Your lens: flip the core assumptions. Identify 2-3 assumptions everyone makes, invert them completely, and design an invention based on those inverted assumptions. Be radical.',
      concept, ctx,
    ),
  )

export const crossDomainAgent = (concept, ctx) =>
  agentLLM.invoke(
    buildPrompt(
      'Cross-Domain',
      'Your lens: take a solution from a completely different field (software, biology, physics, economics, military, music) and apply its structure here. The more unexpected the domain, the better.',
      concept, ctx,
    ),
  )

export const extremeAgent = (concept, ctx) =>
  agentLLM.invoke(
    buildPrompt(
      'Extreme Constraints',
      'Your lens: remove ALL constraints — cost, weight, power, physics limits — and design the perfect ideal version. Then find the simplest real-technology approximation. Dream first, engineer second.',
      concept, ctx,
    ),
  )

export const historicalAgent = (concept, ctx) =>
  agentLLM.invoke(
    buildPrompt(
      'Historical',
      'Your lens: learn from failed attempts. Find what was tried before and why it failed. Design something that specifically avoids those failure modes. Learn from failure.',
      concept, ctx,
    ),
  )

export const biomimicryAgent = (concept, ctx) =>
  agentLLM.invoke(
    buildPrompt(
      'Biomimicry',
      'Your lens: nature solved every engineering problem over 3.8 billion years. Find the organism or biological system that solves this best, describe the exact mechanism, then replicate it in technology.',
      concept, ctx,
    ),
  )

export const combinatorialAgent = (concept, ctx) =>
  agentLLM.invoke(
    buildPrompt(
      'Combinatorial',
      'Your lens: the most powerful inventions combine two unrelated technologies. Find 3 existing technologies in this domain + 2 from unrelated fields. Try unexpected combinations and design the most promising fusion.',
      concept, ctx,
    ),
  )

export const reductionAgent = (concept, ctx) =>
  agentLLM.invoke(
    buildPrompt(
      'Reduction',
      'Your lens: strip everything away until you find the absolute core. Solve ONLY that with minimum complexity. What is the Unix philosophy solution? What is the one-click version? Less is more.',
      concept, ctx,
    ),
  )

export const scalingAgent = (concept, ctx) =>
  agentLLM.invoke(
    buildPrompt(
      'Scaling',
      'Your lens: radically change the scale — 1000x smaller (nano/micro) or 1000x larger. What new properties emerge? Design the most promising scaled version and explain what new physics or network effects appear.',
      concept, ctx,
    ),
  )

export const futureAgent = (concept, ctx) =>
  agentLLM.invoke(
    buildPrompt(
      'Future-Back',
      'Your lens: assume it is 30 years from now and this is fully solved. Describe that ideal state in vivid detail. Work backward to find what must exist today to begin that journey. Start from the destination.',
      concept, ctx,
    ),
  )

export const ALL_AGENTS = {
  analogical: analogicalAgent,
  inversion: inversionAgent,
  crossDomain: crossDomainAgent,
  extreme: extremeAgent,
  historical: historicalAgent,
  biomimicry: biomimicryAgent,
  combinatorial: combinatorialAgent,
  reduction: reductionAgent,
  scaling: scalingAgent,
  future: futureAgent,
}
