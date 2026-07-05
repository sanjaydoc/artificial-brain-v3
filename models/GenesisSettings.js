import mongoose from 'mongoose'

const genesisSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

genesisSettingsSchema.index({ key: 1, userId: 1 }, { unique: true })

genesisSettingsSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const GenesisSettings = mongoose.model('GenesisSettings', genesisSettingsSchema)

// Drop legacy single-field unique index if it exists (was key_1, now key_1_userId_1)
GenesisSettings.on('index', async () => {
  try {
    const coll = GenesisSettings.collection
    const indexes = await coll.indexes()
    const old = indexes.find(i => i.name === 'key_1' && i.unique)
    if (old) { await coll.dropIndex('key_1'); console.log('[GenesisSettings] dropped legacy key_1 unique index') }
  } catch { /* ignore if already gone */ }
})
