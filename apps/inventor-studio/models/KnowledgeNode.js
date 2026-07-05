import mongoose from 'mongoose'
import conn from '../db.js'

// Knowledge graph — nodes (entities/concepts) with embeddings for similarity.
// Mirrors ASI-1's knowledge_nodes Postgres table (incl. v11 unique constraint).
const knowledgeNodeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    type: { type: String, required: true }, // concept | entity | mechanism | etc.
    description: { type: String, default: '' },
    embedding: { type: [Number], default: [] },
    noveltyScore: { type: Number, default: 0, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

// v11: unique (label, type)
knowledgeNodeSchema.index({ label: 1, type: 1 }, { unique: true })
knowledgeNodeSchema.index({ noveltyScore: -1 })
knowledgeNodeSchema.index({ createdAt: -1 })

knowledgeNodeSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const KnowledgeNode = conn.model('KnowledgeNode', knowledgeNodeSchema)
