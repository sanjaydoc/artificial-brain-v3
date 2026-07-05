// Prototype canvas generator — produces nodes + edges for an electronics-style
// schematic preview. Ported from ASI-1 src/agents/canvasGenerator.ts.

import { reasoningLLM } from '../utils/llmAdapter.js'
import { extractJson } from '../utils/parseJson.js'

function getNodeTypes(domain, concept) {
  const c = String(concept || '').toLowerCase()
  if (c.includes('drug') || c.includes('pharma') || c.includes('formul'))
    return 'COMPOUND, EXCIPIENT, EQUIPMENT, PROCESS, CONTAINER, ANALYSIS'
  if (c.includes('cell therapy') || c.includes('gene therapy') || c.includes('crispr') || c.includes('car-t'))
    return 'VECTOR, CELL, BIOREACTOR, ASSAY, FORMULATION, INCUBATOR'
  if (c.includes('biotech') || c.includes('protein') || c.includes('enzyme') || c.includes('ferment'))
    return 'BIOREACTOR, REAGENT, EQUIPMENT, PROCESS, SENSOR, CONTAINER'
  if (c.includes('aero') || c.includes('rocket') || c.includes('satellite') || c.includes('drone') || c.includes('uav'))
    return 'AVIONICS, PROPULSION, STRUCTURE, SENSOR, POWER, ACTUATOR'
  if (c.includes('car') || c.includes('vehicle') || c.includes('automobile') || c.includes('ev ') || c.includes('motor'))
    return 'ECU, MOTOR, SENSOR, POWER, TRANSMISSION, CHASSIS, DISPLAY'
  if (domain === 'software') return 'SERVICE, DATABASE, API, UI, QUEUE, CACHE, AUTH'
  if (domain === 'life-science') return 'COMPOUND, REAGENT, BIOREACTOR, EQUIPMENT, PROCESS, SENSOR, CONTAINER'
  if (domain === 'hardware') return 'MCU, SENSOR, ACTUATOR, POWER, MODULE, DISPLAY, CONNECTOR'
  return 'MCU, SENSOR, ACTUATOR, POWER, MODULE, SERVICE, DATABASE, DISPLAY'
}

function buildFallbackCanvas(title, domain, components) {
  const rawItems = (components?.length > 0)
    ? components.slice(0, 8)
    : ['Input Module', 'Core Processor', 'Data Storage', 'Output Module']

  const domainTypes = domain === 'software'
    ? ['INPUT', 'SERVICE', 'DATABASE', 'API', 'AUTH', 'QUEUE', 'UI', 'OUTPUT']
    : domain === 'life-science'
    ? ['INPUT', 'REAGENT', 'BIOREACTOR', 'PROCESS', 'SENSOR', 'EQUIPMENT', 'CONTAINER', 'OUTPUT']
    : ['INPUT', 'MCU', 'SENSOR', 'ACTUATOR', 'MODULE', 'POWER', 'DISPLAY', 'OUTPUT']

  const nodes = rawItems.map((label, i) => ({
    id: `n${i}`,
    type: domainTypes[i] ?? 'MODULE',
    label: String(label).slice(0, 60),
    description: `${title} — component ${i + 1}`,
    pins: ['IN', 'OUT'],
  }))

  const edges = nodes.slice(0, -1).map((n, i) => ({
    id: `e${i}`,
    source: n.id,
    target: nodes[i + 1].id,
    wireType: 'DATA',
    label: 'data flow',
  }))

  return { nodes, edges }
}

export async function generateCanvas(title, domain, concept, components) {
  const nodeTypes = getNodeTypes(domain, `${concept || ''} ${title || ''}`)
  const componentList = (components || []).slice(0, 8).join(', ') || 'none specified'

  const prompt = `You are a schematic diagram generator. Output ONLY raw JSON — no markdown, no explanation.

INVENTION: ${title}
DOMAIN: ${domain}
CONCEPT: ${String(concept || '').slice(0, 250)}
COMPONENTS: ${componentList}

Output a canvas with 5-8 nodes and connections between them.

NODE TYPES available: ${nodeTypes}
WIRE TYPES: DATA (information/signals), POWER (energy/materials)

Rules:
- 5-8 nodes only
- Every edge source/target must match a real node id exactly
- Each node: 1-3 pin names
- No duplicate node ids

JSON:
{"nodes":[{"id":"n1","type":"MCU","label":"Name","description":"spec","pins":["IN","OUT"]}],"edges":[{"id":"e1","source":"n1","target":"n2","wireType":"DATA","label":"signal"}]}`

  const MAX_RETRIES = 2
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const text = await reasoningLLM.invokeJson(prompt, 2000)
      const parsed = extractJson(text)
      if (parsed && (parsed.nodes?.length ?? 0) >= 2 && (parsed.edges?.length ?? 0) >= 1) {
        const nodeIds = new Set((parsed.nodes ?? []).map((n) => n.id))
        const validEdges = (parsed.edges ?? []).filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
        if (validEdges.length > 0) return { nodes: parsed.nodes, edges: validEdges }
      }
    } catch (err) {
      console.warn(`[canvasGenerator] attempt ${attempt} threw:`, err.message)
    }
  }

  return buildFallbackCanvas(title, domain, components)
}
