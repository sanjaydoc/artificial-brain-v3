// Synthesizer — combines lens-agent outputs into 2 best inventions.
// Ported from ASI-1 src/agents/synthesizer.ts

import { agentLLM } from '../utils/llmAdapter.js'
import { extractJson } from '../utils/parseJson.js'

export async function synthesize(concept, dreamOutputs) {
  const outputsText = Object.entries(dreamOutputs || {})
    .map(([lens, output]) => `[${lens.toUpperCase()} LENS]\n${String(output).slice(0, 600)}`)
    .join('\n\n---\n\n')

  const prompt = `You are the Synthesis Agent. Read these dream agent outputs and synthesize the 2 best invention ideas.

CONCEPT: ${concept}

AGENT OUTPUTS:
${outputsText}

Respond ONLY in this JSON format with no extra text:
{
  "topInventions": [
    {
      "title": "invention name",
      "concept": "2 sentence description",
      "sourceLenses": ["analogical"],
      "noveltyScore": 0.85,
      "feasibilityScore": 0.72,
      "impactScore": 0.91
    }
  ],
  "crossDomainConnections": ["connection 1"],
  "emergentInsight": "one key insight"
}`

  const text = await agentLLM.invokeJson(prompt, 500)
  const parsed = extractJson(text)

  if (parsed?.topInventions?.length) {
    return {
      topInventions: parsed.topInventions.map((inv) => ({
        title: inv.title || '',
        concept: inv.concept || '',
        sourceLenses: Array.isArray(inv.sourceLenses) ? inv.sourceLenses : [],
        noveltyScore: typeof inv.noveltyScore === 'number' ? inv.noveltyScore : 0.7,
        feasibilityScore: typeof inv.feasibilityScore === 'number' ? inv.feasibilityScore : 0.6,
        impactScore: typeof inv.impactScore === 'number' ? inv.impactScore : 0.7,
      })),
      crossDomainConnections: Array.isArray(parsed.crossDomainConnections) ? parsed.crossDomainConnections : [],
      emergentInsight: parsed.emergentInsight || '',
    }
  }

  return {
    topInventions: [{
      title: concept,
      concept: text.slice(0, 500),
      sourceLenses: [],
      noveltyScore: 0.7,
      feasibilityScore: 0.6,
      impactScore: 0.7,
    }],
    crossDomainConnections: [],
    emergentInsight: text.slice(0, 200),
  }
}
