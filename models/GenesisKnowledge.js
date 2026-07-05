import mongoose from 'mongoose'

const genesisKnowledgeSchema = new mongoose.Schema(
  {
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'GenesisAgent', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'GenesisProject', required: true, index: true },
    // Source file info
    sourcePath: { type: String, required: true },
    fileName: { type: String, default: '' },
    // Chunk data
    chunkIndex: { type: Number, default: 0 },
    content: { type: String, required: true },
    charLen: { type: Number, default: 0 },
    // Embedding vector
    embedding: [{ type: Number }],
    embeddingDim: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// Compound index for deduplication
genesisKnowledgeSchema.index({ agentId: 1, sourcePath: 1, chunkIndex: 1 }, { unique: true })

genesisKnowledgeSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    delete ret.embedding // Don't expose vectors in API
    return ret
  },
})

export const GenesisKnowledge = mongoose.model('GenesisKnowledge', genesisKnowledgeSchema)
