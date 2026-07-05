import mongoose from 'mongoose'
import conn from '../db.js'

const criticFeedbackSchema = new mongoose.Schema(
  {
    inventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invention',
      required: true,
      index: true,
    },
    challenge: { type: String, default: '' },
    verdict: {
      type: String,
      enum: ['survives', 'killed', 'refined'],
      default: 'survives',
    },
    reason: { type: String, default: '' },
  },
  { timestamps: true },
)

criticFeedbackSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const CriticFeedback = conn.model('CriticFeedback', criticFeedbackSchema)
