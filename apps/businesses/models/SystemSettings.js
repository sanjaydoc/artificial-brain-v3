// Generic key/value store for system-wide runtime settings.
// Currently used for agent_config (which growth lenses are enabled).

import mongoose from 'mongoose'

const systemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
)

systemSettingsSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema)
