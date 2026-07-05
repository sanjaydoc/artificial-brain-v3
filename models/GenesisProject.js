import mongoose from 'mongoose'

const nodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['agent', 'tool', 'bus'], required: true },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false })

const edgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  type: { type: String, enum: ['direct', 'conditional', 'bus_publish', 'bus_subscribe', 'bus'], default: 'direct' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false })

const versionSchema = new mongoose.Schema({
  savedAt: { type: Date, default: Date.now },
  nodes: [nodeSchema],
  edges: [edgeSchema],
}, { _id: false })

const genesisProjectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    nodes: [nodeSchema],
    edges: [edgeSchema],
    versions: [versionSchema],
    status: { type: String, enum: ['draft', 'deployed', 'stopped'], default: 'draft' },
    // Layer configuration (per-project global settings)
    layerConfig: {
      // Layer 1: Orchestrator
      orchestrator: {
        mode: { type: String, enum: ['manual', 'auto'], default: 'manual' },
        maxConcurrent: { type: Number, default: 3, min: 1, max: 10 },
        maxTokensPerMin: { type: Number, default: 10000, min: 1000, max: 50000 },
      },
      // Layer 2: Memory
      memory: {
        mode: { type: String, enum: ['manual', 'auto'], default: 'manual' },
        defaultThreshold: { type: Number, default: 0.6, min: 0.1, max: 1.0 },
        defaultPruneAge: { type: Number, default: 300, min: 60, max: 3600 },
      },
      // Layer 3: Tools
      tools: {
        sandboxMode: { type: Boolean, default: true },
        maxCallsPerMin: { type: Number, default: 30, min: 5, max: 100 },
        blockedTools: [{ type: String }],
      },
      // Layer 4: Identity
      identity: {
        tokenTTL: { type: Number, default: 3600, min: 300, max: 86400 },
        defaultScopes: {
          read: { type: Boolean, default: true },
          write: { type: Boolean, default: true },
          admin: { type: Boolean, default: false },
        },
      },
      // Layer 6: Guardrails
      guardrails: {
        inputCheck: { type: Boolean, default: true },
        outputCheck: { type: Boolean, default: true },
        sensitivity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        autoApprove: { type: Boolean, default: false },
        notifications: {
          email: { type: String, default: '' },
          webhook: { type: String, default: '' },
        },
        governanceRules: [{
          action: { type: String, required: true },
          threshold: { type: String, default: '' },
          requires: { type: String, default: 'human_approval' },
          _id: false,
        }],
      },
    },
  },
  { timestamps: true },
)

genesisProjectSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const GenesisProject = mongoose.model('GenesisProject', genesisProjectSchema)
