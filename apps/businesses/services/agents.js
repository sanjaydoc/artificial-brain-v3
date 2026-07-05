// 10 business growth agents — each applies a different reasoning lens to the
// same business context. Inspired by ASI-1's dream agents, rewritten for
// businesses (growth + cost-reduction) instead of inventions.

import { chat } from './llm.js'

const SHARED_OUTPUT_RULES = `
Output rules:
- Be concrete: name specific actions, channels, partners, or experiments. No platitudes.
- Quantify when reasonable (e.g. "cut CAC by 30%", "test 200 prospects/week").
- 2 to 3 short paragraphs total. No bullet lists, no markdown headings.
- Speak directly to the business owner.`.trim()

function buildPrompt(lens, instruction, concept, context) {
  return `You are a ${lens} Growth Agent for a business owner.

YOUR LENS:
${instruction}

THE BUSINESS OWNER'S GOAL:
${concept || '(not specified — infer from context)'}

THEIR BUSINESS CONTEXT (uploaded files + scraped sites):
${context || '(no context available — base your reasoning on common patterns for this kind of goal)'}

${SHARED_OUTPUT_RULES}

Now apply YOUR lens. Output only the analysis, no preamble.`.trim()
}

async function runAgent(lens, instruction, concept, context) {
  const t0 = Date.now()
  const r = await chat(
    [{ role: 'user', content: buildPrompt(lens, instruction, concept, context) }],
    { role: 'agent', maxTokens: 350, temperature: 0.85 },
  )
  return {
    lens,
    output: (r.content || '').trim(),
    provider: r.provider,
    model: r.model,
    elapsedMs: Date.now() - t0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent definitions
// ─────────────────────────────────────────────────────────────────────────────

const ANALOGICAL = `
Find a SUCCESSFUL business in an adjacent or unrelated industry that already
solved a similar growth problem to the one this owner faces. Extract the core
mechanism that made it work, then translate it directly into a tactic for THIS
business. Name the company, name the mechanism, name the tactic.`.trim()

const INVERSION = `
Flip every default assumption the business is operating under. What if their
customers don't actually want the product they think they want? What if
charging more would grow demand? What if the slowest channel is actually the
fastest path? Surface 2 inversions and name the experiment that would test the
most counterintuitive one.`.trim()

const CROSS_DOMAIN = `
Pick a tactic from a totally different sector — gaming, military, sports, fast
food, religious organisations, supply chain — and apply it to this business's
growth problem. Name the source, name the mechanism, propose how it ports.`.trim()

const EXTREME = `
What would 10x growth in 90 days actually require? What constraints would
collapse? Conversely, what does 10x the price unlock? Force-explore the
extremes — even if some are impractical — to find the one that's actually
achievable. Name that one tactic concretely.`.trim()

const HISTORICAL = `
Name 1 to 2 businesses that tried something similar in the last 20 years and
FAILED. State the failure mode in one sentence each. Then propose how this
owner avoids each trap concretely. Failures are more instructive than
successes here.`.trim()

const BIOMIMICRY = `
How does nature solve "growing a population on limited resources"? Pick ONE
biological strategy (mycelial networks, swarm intelligence, opportunistic
seeding, pioneer species, mutualism) and translate it into a concrete growth
or cost-cut tactic for THIS business.`.trim()

const COMBINATORIAL = `
Combine 3 separate successful strategies — each from a different industry or
era — into one new compound tactic for this business. Name the 3 sources, then
describe the combined tactic in 2 sentences and what the first experiment
would be.`.trim()

const REDUCTION = `
Strip everything away. What is the ONE channel, ONE customer segment, ONE
offer the business should focus on if it could only do one thing? Defend the
choice with one sharp sentence, then describe the simplest possible week-1
test of that focus.`.trim()

const SCALING = `
What does this business look like when it serves 10 customers vs 10,000 vs
10,000,000? Where does the current operating model break? Identify the
NEAREST breakpoint and propose what to fix BEFORE it hits, plus the leading
indicator the owner should watch.`.trim()

const FUTURE_BACK = `
Picture this business 10 years from now operating at the scale the owner
dreams of. What do its customers say about it? What does its team look like?
Now reason BACKWARDS: what is the single decision in the next 30 days that
makes that future more likely?`.trim()

// ─────────────────────────────────────────────────────────────────────────────
// All 10 agents — caller can invoke individually or via runAllAgents
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_AGENTS = {
  analogical: (concept, ctx) => runAgent('Analogical', ANALOGICAL, concept, ctx),
  inversion: (concept, ctx) => runAgent('Inversion', INVERSION, concept, ctx),
  crossDomain: (concept, ctx) => runAgent('Cross-Domain', CROSS_DOMAIN, concept, ctx),
  extreme: (concept, ctx) => runAgent('Extreme', EXTREME, concept, ctx),
  historical: (concept, ctx) => runAgent('Historical', HISTORICAL, concept, ctx),
  biomimicry: (concept, ctx) => runAgent('Biomimicry', BIOMIMICRY, concept, ctx),
  combinatorial: (concept, ctx) => runAgent('Combinatorial', COMBINATORIAL, concept, ctx),
  reduction: (concept, ctx) => runAgent('Reduction', REDUCTION, concept, ctx),
  scaling: (concept, ctx) => runAgent('Scaling', SCALING, concept, ctx),
  futureBack: (concept, ctx) => runAgent('Future-Back', FUTURE_BACK, concept, ctx),
}

export const AGENT_NAMES = Object.keys(ALL_AGENTS)
