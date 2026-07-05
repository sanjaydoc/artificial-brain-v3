import mongoose from 'mongoose'

const genesisApprovalSchema = new mongoose.Schema(
  {
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'GenesisAgent', required: true, index: true },
    runId: { type: mongoose.Schema.Types.ObjectId, ref: 'GenesisRun', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    context: { type: String, default: '' },
    threshold: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending', index: true },
    notifiedVia: [{ type: String }],
    decidedBy: { type: String, default: '' },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

genesisApprovalSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const GenesisApproval = mongoose.model('GenesisApproval', genesisApprovalSchema)
