import mongoose from 'mongoose'
import conn from '../db.js'

// Knowledge graph — edges between nodes (relationships).
const knowledgeEdgeSchema = new mongoose.Schema(
  {
    sourceNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeNode',
      required: true,
      index: true,
    },
    targetNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeNode',
      required: true,
      index: true,
    },
    relationship: { type: String, required: true }, // causes | enables | contradicts | inspires | ...
    weight: { type: Number, default: 1 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

knowledgeEdgeSchema.index({ sourceNodeId: 1, targetNodeId: 1, relationship: 1 }, { unique: true })

knowledgeEdgeSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const KnowledgeEdge = conn.model('KnowledgeEdge', knowledgeEdgeSchema)
