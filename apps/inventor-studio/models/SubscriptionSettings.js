// Tier configuration — admin-editable. Mirrors ASI-1's `subscription_settings`
// table. One doc per tier (tier1/tier2/tier3). The "free" tier is implicit and
// has no row here.

import mongoose from 'mongoose'
import conn from '../db.js'

const TIERS = ['tier1', 'tier2', 'tier3']

const subscriptionSettingsSchema = new mongoose.Schema(
  {
    tier: { type: String, enum: TIERS, required: true, unique: true, index: true },
    name: { type: String, required: true },
    priceInr: { type: Number, required: true, min: 0 },
    inventionLimit: { type: Number, default: 0 }, // 0 = unlimited
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

subscriptionSettingsSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const SubscriptionSettings = conn.model('SubscriptionSettings', subscriptionSettingsSchema)

// Default tier seeds — used on first boot. Admin can edit prices/features later
// via PUT /api/admin/subscription-settings/:tier without affecting these.
const DEFAULT_TIERS = [
  {
    tier: 'tier1',
    name: 'Explorer',
    priceInr: 999,
    inventionLimit: 10,
    features: [
      '10 dream inventions per month',
      'Full agent pipeline (10 lenses + critique + MVP)',
      'Build guide enrichment with components',
      'PDF + markdown export',
    ],
  },
  {
    tier: 'tier2',
    name: 'Innovator',
    priceInr: 2999,
    inventionLimit: 0,
    features: [
      'Unlimited dream inventions',
      'Vibe Coding (AI pair-coder for inventions)',
      'Knowledge graph + semantic search',
      'Public profile slug at inventorstudio.xyz/<username>',
      'Priority queue (jumps high-volume backlog)',
    ],
  },
  {
    tier: 'tier3',
    name: 'Visionary',
    priceInr: 7999,
    inventionLimit: 0,
    features: [
      'Everything in Innovator',
      'Electronics canvas (3D circuit prototyping)',
      'Cell therapy / DNA + protein design (EVO 2 + ESM-3)',
      'Custom autonomous topics (24×7 dream loop)',
      'Priority support',
    ],
  },
]

export async function seedSubscriptionSettings() {
  for (const t of DEFAULT_TIERS) {
    // Use updateOne with upsert + $setOnInsert so existing rows aren't reset
    // when admin has customised them.
    await SubscriptionSettings.updateOne(
      { tier: t.tier },
      { $setOnInsert: t },
      { upsert: true },
    ).catch((err) => console.warn('[subscriptionSettings seed]', t.tier, err.message))
  }
}
