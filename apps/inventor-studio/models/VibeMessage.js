import mongoose from 'mongoose'
import conn from '../db.js'

// Vibe coding — like Chat but tied to an invention + mode (build/research/etc.).
const vibeMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    inventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invention',
      default: null,
      index: true,
    },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    mode: { type: String, default: 'build' },
  },
  { timestamps: true },
)

vibeMessageSchema.index({ userId: 1, inventionId: 1, createdAt: 1 })

vibeMessageSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const VibeMessage = conn.model('VibeMessage', vibeMessageSchema)
