import mongoose from 'mongoose'
import conn from '../db.js'

// v14: tracks concept patterns that repeatedly score below novelty threshold,
// so the agent can recognise and avoid its own blindspots over time.
const failurePatternSchema = new mongoose.Schema(
  {
    domain: { type: String, required: true, index: true },
    pattern: { type: String, required: true },
    failCount: { type: Number, default: 1 },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

failurePatternSchema.index({ domain: 1, pattern: 1 }, { unique: true })
failurePatternSchema.index({ failCount: -1 })

failurePatternSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const FailurePattern = conn.model('FailurePattern', failurePatternSchema)
