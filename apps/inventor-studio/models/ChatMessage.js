import mongoose from 'mongoose'
import conn from '../db.js'

// Chat with the ASI — user/assistant turns. Optional triggered_invention
// when the assistant queues an invention from a "/invent X" intent.
const chatMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    triggeredInventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invention',
      default: null,
    },
  },
  { timestamps: true },
)

chatMessageSchema.index({ userId: 1, createdAt: 1 })

chatMessageSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const ChatMessage = conn.model('ChatMessage', chatMessageSchema)
