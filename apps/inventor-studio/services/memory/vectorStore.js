// KnowledgeEmbedding store — Mongoose port of ASI-1 memory/vectorStore.ts.
// Atlas $vectorSearch when index is configured; otherwise in-memory cosine.

import { KnowledgeEmbedding } from '../../models/KnowledgeEmbedding.js'
import { embedText } from '../utils/llmAdapter.js'

export async function storeKnowledge(content, source, sourceType, domain, url) {
  try {
    const embedding = await embedText(String(content).slice(0, 8000))
    await KnowledgeEmbedding.create({
      content: String(content).slice(0, 8000),
      source,
      sourceType,
      domain,
      url,
      embedding,
    })
  } catch (err) {
    console.error('[vectorStore] storeKnowledge failed:', err.message)
  }
}

function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export async function findSimilar(query, limit = 5) {
  try {
    const queryEmbedding = await embedText(String(query).slice(0, 500))
    if (!queryEmbedding.length) return []

    try {
      const docs = await KnowledgeEmbedding.aggregate([
        {
          $vectorSearch: {
            index: 'knowledge_embedding',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit,
          },
        },
        { $project: { embedding: 0 } },
      ])
      if (docs.length > 0) {
        return docs.map((d) => ({
          id: String(d._id),
          content: d.content,
          source: d.source,
          sourceType: d.sourceType,
          domain: d.domain,
          url: d.url,
        }))
      }
    } catch {
      // Atlas vector index missing → fall through to in-memory.
    }

    const all = await KnowledgeEmbedding.find({ 'embedding.0': { $exists: true } })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
    const ranked = all
      .map((d) => ({ ...d, _sim: cosine(queryEmbedding, d.embedding || []) }))
      .sort((a, b) => b._sim - a._sim)
      .slice(0, limit)
    return ranked.map((d) => ({
      id: String(d._id),
      content: d.content,
      source: d.source,
      sourceType: d.sourceType,
      domain: d.domain,
      url: d.url,
      similarity: d._sim,
    }))
  } catch (err) {
    console.error('[vectorStore] findSimilar failed:', err.message)
    return []
  }
}
