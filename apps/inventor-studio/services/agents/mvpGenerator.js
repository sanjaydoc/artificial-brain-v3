// MVP / build-spec generator. Ported from ASI-1 src/agents/mvpGenerator.ts.
//
// generateCoreSpecAndCritique: combined critic + core spec in one reasoning call
// generateBuildAndCost:        2nd call — phased build guide + cost breakdown
// generateMVP:                 stitches together a final MVPSpec

import { reasoningLLM } from '../utils/llmAdapter.js'
import { extractJson } from '../utils/parseJson.js'

export async function generateCoreSpecAndCritique(inventionTitle, inventionConcept, priorArt) {
  const priorArtText = (priorArt || []).slice(0, 3).join(', ') || 'none found'

  const prompt = `You are the Critic+MVP Agent. Evaluate this invention for novelty AND generate its core spec. Output ONLY raw JSON, no markdown.

TITLE: ${inventionTitle}
CONCEPT: ${String(inventionConcept || '').slice(0, 350)}
PRIOR ART: ${priorArtText.slice(0, 150)}

JSON:
{"verdict":"survives","challenges":["ch1","ch2"],"refinements":["r1"],"finalNoveltyScore":0.82,"reason":"one paragraph","title":"...","domain":"hybrid","oneLiner":"...","concept":"...","problemSolved":"...","components":["c1","c2","c3"],"prototypeSteps":["s1","s2","s3"],"noveltyScore":0.8,"feasibilityScore":0.7,"impactScore":0.85,"priorArt":["p1"],"nextExperiments":["e1","e2"],"timeToPrototype":"3-6 weeks","codeScaffold":"// pseudocode or starter code snippet (10-15 lines)"}`

  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const text = await reasoningLLM.invokeJson(prompt, 1800)
    const parsed = extractJson(text)
    if (parsed?.title && parsed?.verdict) {
      return {
        core: parsed,
        criticResult: {
          verdict: parsed.verdict ?? 'refined',
          challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [],
          refinements: Array.isArray(parsed.refinements) ? parsed.refinements : [],
          finalNoveltyScore: typeof parsed.finalNoveltyScore === 'number' ? parsed.finalNoveltyScore : 0.65,
          reason: parsed.reason ?? '',
        },
      }
    }
    console.warn(`[mvpGenerator] critiqueCore attempt ${attempt} unparseable`)
  }
  return {
    core: {},
    criticResult: { verdict: 'refined', challenges: [], refinements: [], finalNoveltyScore: 0.65, reason: '' },
  }
}

export async function generateBuildAndCost(inventionTitle, inventionConcept, domain) {
  const prompt = `You are a technical prototyping expert. Generate a build guide and cost breakdown for this specific invention.

INVENTION: ${inventionTitle}
CONCEPT: ${String(inventionConcept || '').slice(0, 300)}
DOMAIN: ${domain}

Output ONLY a raw JSON object. No markdown, no explanation, no extra text. Fill in REAL specific steps and costs for THIS invention.

Example format (replace ALL values with real content for this invention):
{"buildGuide":[{"phase":"Phase 1: Research & Sourcing","duration":"1 week","steps":["Identify required components for ${inventionTitle}","Source materials from suppliers","Set up development environment"]},{"phase":"Phase 2: Core Development","duration":"2-3 weeks","steps":["Build the primary mechanism","Integrate subsystems","Implement core logic"]},{"phase":"Phase 3: Testing & Validation","duration":"1 week","steps":["Run unit tests","Validate against requirements","Document findings"]}],"costBreakdown":{"items":[{"name":"Primary components","cost":"$50-100","notes":"Core materials for the invention"},{"name":"Development tools","cost":"$20-50","notes":"Software or hardware tools"},{"name":"Testing & iteration","cost":"$30-80","notes":"Materials for prototyping cycles"}],"totalEstimate":"$100-$230","notes":"Estimated cost for first working prototype"}}`

  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const text = await reasoningLLM.invokeJson(prompt, 2400)
    const parsed = extractJson(text)
    const guideLen = parsed?.buildGuide?.length ?? 0
    const costLen = parsed?.costBreakdown?.items?.length ?? 0
    if (parsed && guideLen >= 2 && costLen >= 2) {
      return { buildGuide: parsed.buildGuide, costBreakdown: parsed.costBreakdown }
    }
    console.warn(`[mvpGenerator] buildAndCost attempt ${attempt} insufficient`)
  }

  return {
    buildGuide: [
      { phase: 'Phase 1: Research & Setup', duration: '1 week', steps: [`Research existing solutions for ${inventionTitle}`, 'Identify required materials and tools', 'Set up development workspace'] },
      { phase: 'Phase 2: Prototype Build', duration: '2-3 weeks', steps: ['Build core components', 'Integrate subsystems', 'Run initial functionality tests'] },
      { phase: 'Phase 3: Test & Iterate', duration: '1 week', steps: ['Validate prototype against design goals', 'Fix identified issues', 'Document results and next steps'] },
    ],
    costBreakdown: {
      items: [
        { name: 'Core materials & components', cost: '$50-200', notes: `Primary materials for ${inventionTitle}` },
        { name: 'Tools & development setup', cost: '$30-100', notes: 'Hardware/software tools required for prototyping' },
        { name: 'Testing & iteration budget', cost: '$20-80', notes: 'Materials consumed during testing cycles' },
      ],
      totalEstimate: '$100-$380',
      notes: `Estimated cost for a first working prototype of ${inventionTitle}.`,
    },
  }
}

export async function generateMVP(inventionTitle, inventionConcept, core) {
  const domain = core?.domain ?? 'hybrid'
  const buildAndCost = await generateBuildAndCost(inventionTitle, inventionConcept, domain)

  const problemSolved = core?.problemSolved?.trim()
    || `${inventionTitle} addresses the core challenge described in the concept: ${String(inventionConcept || '').slice(0, 200).trimEnd()}${(inventionConcept || '').length > 200 ? '...' : ''}`

  const components = (core?.components?.length)
    ? core.components
    : buildAndCost.buildGuide.flatMap((phase) =>
        phase.steps.slice(0, 1).map((s) => s.replace(/^[A-Z][a-z]+ /, '').slice(0, 100)),
      ).slice(0, 5)

  const prototypeSteps = (core?.prototypeSteps?.length)
    ? core.prototypeSteps
    : buildAndCost.buildGuide.flatMap((phase) =>
        phase.steps.map((s) => `[${phase.phase.split(':')[0]}] ${s}`),
      ).slice(0, 8)

  const codeScaffold = core?.codeScaffold?.trim() || (() => {
    const t = core?.title ?? inventionTitle
    if (domain === 'software') return `// ${t} — Core Logic Scaffold\n\nclass ${t.replace(/\s+/g, '')} {\n  constructor(config) {\n    this.config = config\n    this.state = {}\n  }\n  async initialize() {}\n  async process(input) { return { result: null, confidence: 0 } }\n  async shutdown() {}\n}`
    if (domain === 'life-science') return `# ${t} — Experimental Protocol Scaffold\n\ndef run_experiment(sample, config):\n    materials = prepare_materials(config)\n    result = process(sample, materials)\n    return analyze(result)`
    return `// ${t} — Firmware Scaffold\n\n#include <Arduino.h>\n#define SENSOR_PIN A0\n#define OUTPUT_PIN 9\n\nvoid setup() {\n  Serial.begin(115200)\n  pinMode(OUTPUT_PIN, OUTPUT)\n}\n\nvoid loop() {\n  int reading = analogRead(SENSOR_PIN)\n  delay(100)\n}`
  })()

  const nextExperiments = (core?.nextExperiments?.length)
    ? core.nextExperiments
    : [
        `Validate core mechanism of ${core?.title ?? inventionTitle} with a bench-scale prototype`,
        'Test performance under real-world environmental conditions',
        'Compare against 2–3 existing solutions on key metrics',
        'Run a small user study to gather qualitative feedback',
        'Identify top failure modes and iterate on the design',
      ]

  return {
    title: core?.title ?? inventionTitle,
    domain,
    oneLiner: core?.oneLiner ?? String(inventionConcept || '').slice(0, 120),
    concept: core?.concept ?? inventionConcept,
    problemSolved,
    components,
    prototypeSteps,
    noveltyScore: core?.noveltyScore ?? 0.7,
    feasibilityScore: core?.feasibilityScore ?? 0.6,
    impactScore: core?.impactScore ?? 0.7,
    priorArt: core?.priorArt ?? [],
    crossDomainConnections: core?.crossDomainConnections ?? [],
    nextExperiments,
    estimatedPrototypeCost: buildAndCost.costBreakdown.totalEstimate || 'TBD',
    timeToPrototype: core?.timeToPrototype ?? 'TBD',
    buildGuide: buildAndCost.buildGuide,
    costBreakdown: buildAndCost.costBreakdown,
    codeScaffold,
  }
}
