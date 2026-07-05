import mongoose from 'mongoose'

const genesisAgentSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'GenesisProject', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    nodeId: { type: String, required: true },
    name: { type: String, required: true },
    systemPrompt: { type: String, default: '' },
    llmConfig: {
      mode: { type: String, enum: ['simple', 'role', 'custom'], default: 'simple' },
      role: { type: String, enum: ['reasoning', 'language', 'coder'], default: 'language' },
      customUrl: { type: String, default: '' },
      model: { type: String, default: '' },
      temperature: { type: Number, default: 0.7 },
      maxTokens: { type: Number, default: 2048 },
    },
    runtime: {
      type: { type: String, enum: ['on-demand', 'always-on'], default: 'on-demand' },
      schedule: { type: String, default: '' },
      triggers: [{ type: String }],
    },
    toolPermissions: [{ type: String }],
    secrets: { type: Map, of: String, default: new Map() },
    layers: {
      priority: { type: Number, default: 5, min: 1, max: 10 },
      memoryType: [{ type: String }],
      memoryQuota: { short: { type: Number, default: 100 }, long: { type: Number, default: 50 } },
      toolRateLimit: { type: Number, default: 0 }, // 0 = use project default
      scopes: [{ type: String }], // e.g. ['read', 'write']
    },
    status: { type: String, enum: ['idle', 'running', 'error', 'waiting_approval', 'stopped'], default: 'idle' },
    lastError: { type: String, default: '' },
  },
  { timestamps: true },
)

genesisAgentSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    delete ret.secrets  // never expose secrets in API responses
    return ret
  },
})

export const GenesisAgent = mongoose.model('GenesisAgent', genesisAgentSchema)
