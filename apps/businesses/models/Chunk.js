import mongoose from 'mongoose'

// Generic chunk: a piece of text from either an Upload or a Scrape.
// Embedding vector lives here too (Phase 4 fills it via OpenRouter).
const chunkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceType: {
      type: String,
      enum: ['upload', 'scrape'],
      required: true,
      index: true,
    },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    ix: { type: Number, required: true }, // position within the source (0..n)
    text: { type: String, required: true }, // raw chunk text
    charLen: { type: Number, required: true },
    // Vector index is created in Atlas (separate definition) once Phase 4 starts embedding.
    embedding: { type: [Number], default: undefined },
    embeddingModel: { type: String, default: '' },
  },
  { timestamps: true },
)

chunkSchema.index({ userId: 1, sourceType: 1, sourceId: 1, ix: 1 }, { unique: true })

chunkSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id
    delete ret._id
    delete ret.embedding // never ship vectors over the wire by default
    return ret
  },
})

export const Chunk = mongoose.model('Chunk', chunkSchema)
