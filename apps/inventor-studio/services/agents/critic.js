// Critic — evaluates an invention for novelty + feasibility.
// Ported from ASI-1 src/agents/critic.ts

import { reasoningLLM } from '../utils/llmAdapter.js'
import { extractJson } from '../utils/parseJson.js'

export async function critique(inventionTitle, inventionConcept, priorArt) {
  const priorArtText = (priorArt && priorArt.length > 0)
    ? priorArt.join('\n')
    : 'No prior art found in search.'

  const prompt = `You are the Critic Agent. Evaluate this invention for novelty and feasibility.

INVENTION: ${inventionTitle}
CONCEPT: ${String(inventionConcept || '').slice(0, 300)}
PRIOR ART: ${priorArtText.slice(0, 200)}

Verdict options: "survives" (novel + feasible), "refined" (needs changes), "killed" (not novel or feasible).

Respond ONLY in this JSON format with no extra text:
{
  "verdict": "survives",
  "challenges": ["challenge 1", "challenge 2"],
  "refinements": ["refinement 1"],
  "finalNoveltyScore": 0.82,
  "reason": "one paragraph explanation"
}`

  const text = await reasoningLLM.invokeJson(prompt, 600)
  const parsed = extractJson(text)

  if (parsed?.verdict) {
    return {
      verdict: parsed.verdict,
      challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [],
      refinements: Array.isArray(parsed.refinements) ? parsed.refinements : [],
      finalNoveltyScore: typeof parsed.finalNoveltyScore === 'number' ? parsed.finalNoveltyScore : 0.65,
      reason: parsed.reason || '',
    }
  }

  return {
    verdict: 'refined',
    challenges: ['Could not fully parse critic output'],
    refinements: [],
    finalNoveltyScore: 0.65,
    reason: text.slice(0, 400),
  }
}
