import mongoose from 'mongoose'

const chatMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    triggeredGrowthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Growth',
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
    ret.id = ret._id
    delete ret._id
    return ret
  },
})

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)
