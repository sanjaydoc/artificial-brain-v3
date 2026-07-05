import mongoose from 'mongoose'

const stepSchema = new mongoose.Schema({
  ts: { type: Date, default: Date.now },
  type: { type: String, enum: ['llm_call', 'tool_call', 'tool_result', 'decision', 'response', 'guardrail_check', 'error'], required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  tokenUsage: { type: Number, default: 0 },
}, { _id: false })

const genesisRunSchema = new mongoose.Schema(
  {
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'GenesisAgent', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'GenesisProject', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trigger: { type: String, enum: ['manual', 'api', 'schedule', 'event'], default: 'manual' },
    input: { type: String, default: '' },
    output: { type: String, default: '' },
    steps: [stepSchema],
    status: { type: String, enum: ['running', 'completed', 'failed', 'blocked'], default: 'running' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

genesisRunSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const GenesisRun = mongoose.model('GenesisRun', genesisRunSchema)
