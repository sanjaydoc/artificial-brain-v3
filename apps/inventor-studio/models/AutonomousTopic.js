import mongoose from 'mongoose'
import conn from '../db.js'

// Topics the autonomous scheduler picks from when running on its own.
const autonomousTopicSchema = new mongoose.Schema(
  {
    domain: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    seed: { type: String, default: '' },
    enabled: { type: Boolean, default: true, index: true },
    lastUsedAt: { type: Date, default: null },
    timesUsed: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

autonomousTopicSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const AutonomousTopic = conn.model('AutonomousTopic', autonomousTopicSchema)
