import mongoose from 'mongoose'
import conn from '../db.js'

const streamEventSchema = new mongoose.Schema(
  {
    inventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invention',
      required: true,
      index: true,
    },
    eventType: { type: String, required: true },
    // agent_start | agent_output | synthesizing | critique | complete | error
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

streamEventSchema.index({ inventionId: 1, createdAt: 1 })

streamEventSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const StreamEvent = conn.model('StreamEvent', streamEventSchema)
