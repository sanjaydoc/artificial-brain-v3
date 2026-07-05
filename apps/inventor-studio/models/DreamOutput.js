import mongoose from 'mongoose'
import conn from '../db.js'

const dreamOutputSchema = new mongoose.Schema(
  {
    inventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invention',
      required: true,
      index: true,
    },
    agentLens: { type: String, required: true },
    output: { type: String, default: '' },
    tokensUsed: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    provider: { type: String, default: '' },
    model: { type: String, default: '' },
  },
  { timestamps: true },
)

dreamOutputSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const DreamOutput = conn.model('DreamOutput', dreamOutputSchema)
