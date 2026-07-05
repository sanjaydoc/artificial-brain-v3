// Knowledge graph helpers — Mongoose port of ASI-1 memory/knowledgeGraph.ts.
// Postgres recursive CTE traversals are flattened to manual BFS via Mongoose.

import { KnowledgeNode } from '../../models/KnowledgeNode.js'
import { KnowledgeEdge } from '../../models/KnowledgeEdge.js'
import { embedText } from '../utils/llmAdapter.js'

// label, type, content, domain, source, noveltyScore, metadata
export async function addNode(label, type, content, domain, source, noveltyScore = 0, metadata = {}) {
  if (!label || !content) return ''
  try {
    const safeLabel = String(label).slice(0, 499)
    let embedding = []
    try {
      embedding = await embedText(String(content).slice(0, 500))
    } catch {}

    const updated = await KnowledgeNode.findOneAndUpdate(
      { label: safeLabel, type },
      {
        $set: {
          description: String(content).slice(0, 4000),
          embedding,
          metadata: { domain, source, ...metadata },
        },
        $max: { noveltyScore },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    return String(updated._id)
  } catch (err) {
    console.error('[knowledgeGraph] addNode failed:', err.message)
    return ''
  }
}

export async function addEdge(fromNodeId, toNodeId, relationship, weight = 0.5, context = '') {
  if (!fromNodeId || !toNodeId || String(fromNodeId) === String(toNodeId)) return
  try {
    await KnowledgeEdge.findOneAndUpdate(
      { sourceNodeId: fromNodeId, targetNodeId: toNodeId, relationship },
      {
        $max: { weight },
        $set: { metadata: { context } },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  } catch (err) {
    console.error('[knowledgeGraph] addEdge failed:', err.message)
  }
}

// Cosine similarity helper for in-memory similarity search.
function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

// findSimilarNodes — uses Atlas $vectorSearch when available, otherwise
// in-memory cosine over all nodes (acceptable while the graph stays small).
export async function findSimilarNodes(query, limit = 8) {
  try {
    const queryEmbedding = await embedText(String(query).slice(0, 500))
    if (!queryEmbedding.length) return []

    // Try Atlas $vectorSearch first (index name: 'knowledge_node_embedding').
    try {
      const docs = await KnowledgeNode.aggregate([
        {
          $vectorSearch: {
            index: 'knowledge_node_embedding',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit,
          },
        },
        { $project: { embedding: 0 } },
      ])
      if (docs.length > 0) return docs.map(toNode)
    } catch {
      // Fall through to in-memory.
    }

    // In-memory fallback: load nodes that have embeddings and rank by cosine.
    const all = await KnowledgeNode.find({ 'embedding.0': { $exists: true } })
      .sort({ noveltyScore: -1, createdAt: -1 })
      .limit(500)
      .lean()
    const ranked = all
      .map((n) => ({ ...n, _sim: cosine(queryEmbedding, n.embedding || []) }))
      .sort((a, b) => b._sim - a._sim)
      .slice(0, limit)
    return ranked.map(toNode)
  } catch (err) {
    console.error('[knowledgeGraph] findSimilarNodes failed:', err.message)
    return []
  }
}

// BFS up to maxDepth across edges in either direction.
export async function findRelatedNodes(nodeId, maxDepth = 2, relationships = ['CONNECTS_TO', 'INSPIRED_BY', 'EVOLVED_INTO', 'SIMILAR_TO']) {
  if (!nodeId) return []
  try {
    const visited = new Set([String(nodeId)])
    let frontier = [String(nodeId)]
    for (let d = 0; d < maxDepth && frontier.length > 0; d++) {
      const nextEdges = await KnowledgeEdge.find({
        $or: [{ sourceNodeId: { $in: frontier } }, { targetNodeId: { $in: frontier } }],
        relationship: { $in: relationships },
      }).lean()
      const nextIds = []
      for (const e of nextEdges) {
        const a = String(e.sourceNodeId)
        const b = String(e.targetNodeId)
        for (const id of [a, b]) if (!visited.has(id)) { visited.add(id); nextIds.push(id) }
      }
      frontier = nextIds
    }
    visited.delete(String(nodeId))
    if (visited.size === 0) return []
    const docs = await KnowledgeNode.find({ _id: { $in: [...visited] } })
      .sort({ noveltyScore: -1 })
      .limit(25)
      .lean()
    return docs.map(toNode)
  } catch (err) {
    console.error('[knowledgeGraph] findRelatedNodes failed:', err.message)
    return []
  }
}

export async function findOrCreateNode(label, type, content, domain, source, noveltyScore = 0) {
  return addNode(label, type, content, domain, source, noveltyScore)
}

export async function linkToSimilar(nodeId, query, relationship = 'SIMILAR_TO', topK = 3, minSimilarity = 0.7) {
  if (!nodeId) return
  try {
    const seedDoc = await KnowledgeNode.findById(nodeId).lean()
    const seedEmb = seedDoc?.embedding || []
    if (!seedEmb.length) return

    const similar = await findSimilarNodes(query, topK + 5)
    for (const node of similar) {
      if (String(node.id) === String(nodeId)) continue
      const target = await KnowledgeNode.findById(node.id).lean()
      const sim = cosine(seedEmb, target?.embedding || [])
      if (sim >= minSimilarity) {
        await addEdge(nodeId, node.id, relationship, sim, `auto-linked similarity=${sim.toFixed(2)}`)
      }
    }
  } catch (err) {
    console.error('[knowledgeGraph] linkToSimilar failed:', err.message)
  }
}

export async function buildGraphContext(concept, limit = 8) {
  try {
    const similarNodes = await findSimilarNodes(concept, limit)
    if (similarNodes.length === 0) return ''

    const lines = ['[Knowledge Graph — Prior Inventions & Concepts]']
    for (const node of similarNodes.slice(0, 5)) {
      const typeLabel = node.type === 'invention' ? '[INV]' : node.type === 'paper' ? '[PAPER]' : node.type === 'agent_output' ? '[AGENT]' : '[CONCEPT]'
      lines.push(`${typeLabel} ${node.label} (novelty: ${(node.noveltyScore || 0).toFixed(2)})`)
      if (node.description) lines.push(`  > ${String(node.description).slice(0, 200)}`)
      const neighbours = await findRelatedNodes(node.id, 1)
      for (const nb of neighbours.slice(0, 3)) lines.push(`  - ${nb.label} (${nb.type})`)
    }
    return lines.join('\n')
  } catch (err) {
    console.error('[knowledgeGraph] buildGraphContext failed:', err.message)
    return ''
  }
}

export async function getGraphStats() {
  try {
    const [totalNodes, totalEdges, byType] = await Promise.all([
      KnowledgeNode.countDocuments({}),
      KnowledgeEdge.countDocuments({}),
      KnowledgeNode.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    ])
    const nodesByType = {}
    for (const r of byType) nodesByType[r._id] = r.count
    return {
      totalNodes,
      totalEdges,
      nodesByType,
      avgConnections: totalNodes > 0 ? (totalEdges * 2) / totalNodes : 0,
    }
  } catch (err) {
    return { totalNodes: 0, totalEdges: 0, nodesByType: {}, avgConnections: 0 }
  }
}

function toNode(d) {
  return {
    id: String(d._id || d.id),
    label: d.label,
    type: d.type,
    description: d.description || '',
    noveltyScore: d.noveltyScore || 0,
    metadata: d.metadata || {},
  }
}
