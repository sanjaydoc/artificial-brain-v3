// Generic key/value store for system-wide runtime settings. Mirrors ASI-1's
// `system_settings` table. Currently used for agent_config (which dream lenses
// are enabled). Add more keys as needed.

import mongoose from 'mongoose'
import conn from '../db.js'

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

export const SystemSettings = conn.model('SystemSettings', systemSettingsSchema)
