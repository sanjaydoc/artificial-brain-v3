import mongoose from 'mongoose'
import conn from '../db.js'

// Singleton-ish — current mood/emotion state of the autonomous engine.
// The dream loop reads + updates this each cycle; the public consciousness
// stream broadcasts changes.
const consciousnessSchema = new mongoose.Schema(
  {
    // Always one row — keyed by 'global' so we don't accidentally create many.
    scope: { type: String, default: 'global', unique: true, index: true },
    curiosity: { type: Number, default: 0.5 },
    satisfaction: { type: Number, default: 0.5 },
    excitement: { type: Number, default: 0.5 },
    frustration: { type: Number, default: 0 },
    energy: { type: Number, default: 0.5 },
    lastMonologue: { type: String, default: '' },
    lastCycleAt: { type: Date, default: null },
    cycleCount: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

consciousnessSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const Consciousness = conn.model('Consciousness', consciousnessSchema)
