import mongoose from 'mongoose'

const agentEntrySchema = new mongoose.Schema(
  {
    lens: { type: String, required: true },
    output: { type: String, default: '' },
    provider: { type: String, default: '' },
    model: { type: String, default: '' },
    elapsedMs: { type: Number, default: 0 },
    error: { type: String, default: '' },
    completedAt: { type: Date, default: null },
  },
  { _id: false },
)

const planSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    oneLiner: { type: String, default: '' },
    problemSolved: { type: String, default: '' },
    growthOpportunities: { type: [String], default: [] },
    executionPlan: { type: [mongoose.Schema.Types.Mixed], default: [] }, // [{ phase, duration, steps[] }]
    costStructure: { type: mongoose.Schema.Types.Mixed, default: {} },
    costCutOpportunities: { type: [mongoose.Schema.Types.Mixed], default: [] },
    noveltyScore: { type: Number, default: 0 },
    feasibilityScore: { type: Number, default: 0 },
    impactScore: { type: Number, default: 0 },
    competitorAnalysis: { type: [String], default: [] },
    marketConnections: { type: [String], default: [] },
    nextExperiments: { type: [String], default: [] },
    timeToFirstResults: { type: String, default: '' },
  },
  { _id: false },
)

const growthSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    concept: { type: String, required: true }, // user's goal/question
    status: {
      type: String,
      enum: ['queued', 'gathering', 'reasoning', 'synthesizing', 'critiquing', 'planning', 'complete', 'error'],
      default: 'queued',
      index: true,
    },
    contextLength: { type: Number, default: 0 }, // chars of business context fed to agents
    sourceCounts: {
      uploads: { type: Number, default: 0 },
      scrapes: { type: Number, default: 0 },
      chunks: { type: Number, default: 0 },
    },
    agents: { type: [agentEntrySchema], default: [] },
    synthesis: { type: String, default: '' }, // top growth strategies, narrative
    critique: { type: String, default: '' }, // refined challenges + adjustments
    plan: { type: planSchema, default: () => ({}) },
    error: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    totalElapsedMs: { type: Number, default: 0 },

    // Public sharing — owner toggles to true to expose at /share/:id
    isPublic: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

growthSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id
    delete ret._id
    return ret
  },
})

export const Growth = mongoose.model('Growth', growthSchema)
