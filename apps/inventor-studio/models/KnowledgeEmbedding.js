import mongoose from 'mongoose'
import conn from '../db.js'

// Per-source embedding for retrieval. Atlas vector index expected on
// `embedding` (1536 dims since we use OpenRouter `text-embedding-3-small`).
const knowledgeEmbeddingSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    source: { type: String, default: '' },
    sourceType: { type: String, default: '' }, // arxiv | pubmed | uspto | github | pubchem | web
    domain: { type: String, default: '' },
    url: { type: String, default: '' },
    embedding: { type: [Number], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

knowledgeEmbeddingSchema.index({ sourceType: 1 })
knowledgeEmbeddingSchema.index({ domain: 1 })

knowledgeEmbeddingSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const KnowledgeEmbedding = conn.model('KnowledgeEmbedding', knowledgeEmbeddingSchema)
