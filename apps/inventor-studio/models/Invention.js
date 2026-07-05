import mongoose from 'mongoose'
import conn from '../db.js'

const inventionSchema = new mongoose.Schema(
  {
    userId: {
      // Optional — guest dreams (anonymous users from the homepage hero) have no
      // user attached; they're identified by `isGuest: true` for filtering.
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    isGuest: { type: Boolean, default: false, index: true },
    title: { type: String, default: '' },
    domain: {
      type: String,
      enum: ['software', 'hardware', 'life-science', 'hybrid', 'other'],
      default: 'other',
    },
    seedConcept: { type: String, required: true },
    mode: {
      type: String,
      enum: ['dream', 'invent', 'evolve'],
      default: 'dream',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'searching',
        'dreaming',
        'synthesizing',
        'critiquing',
        'complete',
        'failed',
      ],
      default: 'pending',
      index: true,
    },
    noveltyScore: { type: Number, default: 0 },
    feasibilityScore: { type: Number, default: 0 },
    impactScore: { type: Number, default: 0 },
    inventionSpec: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Pipeline outputs persisted so InventionDetail can render the full picture
    // without re-fetching from DreamOutput / CriticFeedback collections.
    agents: { type: mongoose.Schema.Types.Mixed, default: {} },     // { lensId: outputText }
    synthesis: { type: mongoose.Schema.Types.Mixed, default: null }, // { emergentInsight, topInventions, ... }
    critique: { type: mongoose.Schema.Types.Mixed, default: null },  // { verdict, reason, finalNoveltyScore, challenges }
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invention',
      default: null,
    },
    cycleCount: { type: Number, default: 0 },
    asiVersion: { type: String, default: 'asi-3' },
    embedding: { type: [Number], default: null }, // 768-dim from Ollama nomic-embed-text
    isPublic: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

inventionSchema.index({ userId: 1, createdAt: -1 })
inventionSchema.index({ status: 1, createdAt: -1 })

inventionSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const Invention = conn.model('Invention', inventionSchema)
