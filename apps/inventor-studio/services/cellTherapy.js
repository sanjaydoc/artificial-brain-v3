// Cell therapy pipeline — domain-specific 4-stage pipeline for life-science
// inventions. STUB: full ASI-1 cellTherapy.ts (330 LOC) is not yet ported.
// The dream loop will hand off here when domain === 'cell-therapy'; we return
// a minimal MVPSpec-shaped object so the pipeline still completes gracefully.
//
// TODO: port from ASI-1 src/cellTherapy.ts — runCellTherapyPipeline +
// helpers (calls EVO 2 / ESM-3 / NIM bio-APIs via services/utils/bioApis.js).

import { reasoningLLM } from './utils/llmAdapter.js'

export async function runCellTherapyPipeline(inventionId, concept, emitter) {
  try {
    emitter?.emit?.(inventionId, 'status', { phase: 'cell_therapy_stub', message: 'Cell therapy pipeline (stubbed) generating outline...' })

    const prompt = `You are a cell therapy invention specialist. For this concept generate a high-level outline only.

CONCEPT: ${String(concept || '').slice(0, 400)}

Output ONLY this JSON (one line):
{"title":"...","oneLiner":"...","concept":"...","problemSolved":"...","components":["c1","c2"],"prototypeSteps":["s1","s2","s3"],"noveltyScore":0.7,"feasibilityScore":0.55,"impactScore":0.8}`

    const text = await reasoningLLM.invokeJson(prompt, 800)
    let parsed = null
    try { parsed = JSON.parse(text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()) } catch {}

    return {
      title: parsed?.title || concept,
      domain: 'cell-therapy',
      oneLiner: parsed?.oneLiner || String(concept).slice(0, 120),
      concept: parsed?.concept || concept,
      problemSolved: parsed?.problemSolved || `${concept} addresses a cell-therapy gap.`,
      components: parsed?.components || ['Vector', 'Cell line', 'Bioreactor', 'Assay'],
      prototypeSteps: parsed?.prototypeSteps || [
        'Design vector and CRISPR guide RNAs',
        'Validate in vitro cell line transduction',
        'Scale up in bioreactor',
        'Evaluate efficacy in animal model',
      ],
      buildGuide: [],
      costBreakdown: { items: [], totalEstimate: 'TBD', notes: 'Stub — port pending' },
      noveltyScore: parsed?.noveltyScore ?? 0.7,
      feasibilityScore: parsed?.feasibilityScore ?? 0.55,
      impactScore: parsed?.impactScore ?? 0.8,
      priorArt: [],
      crossDomainConnections: [],
      nextExperiments: ['Run in vitro validation', 'Pilot animal study'],
      estimatedPrototypeCost: 'TBD',
      timeToPrototype: '6-12 months',
      codeScaffold: '',
    }
  } catch (err) {
    console.error('[cellTherapy stub] failed:', err.message)
    return null
  }
}
