// Live-editable tier definitions. Admin can change price + features without
// a code deploy. Seeded with defaults on first server boot if collection is empty.

import mongoose from 'mongoose'

export const TIER_CODES = ['free', 'starter', 'growth', 'enterprise']

const subscriptionSettingsSchema = new mongoose.Schema(
  {
    tier: {
      type: String,
      enum: TIER_CODES,
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true },
    priceInr: { type: Number, required: true, default: 0 },
    analysisLimit: { type: Number, required: true, default: 0 }, // 0 = unlimited
    analysisPeriodDays: { type: Number, required: true, default: 365 }, // free=30, paid=365
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

subscriptionSettingsSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id
    delete ret._id
    return ret
  },
})

export const SubscriptionSettings = mongoose.model(
  'SubscriptionSettings',
  subscriptionSettingsSchema,
)

const DEFAULTS = [
  {
    tier: 'free',
    name: 'Free',
    priceInr: 0,
    analysisLimit: 1,
    analysisPeriodDays: 30,
    features: ['1 growth analysis per month', 'PDF export', 'Public share links'],
  },
  {
    tier: 'starter',
    name: 'Starter',
    priceInr: 999,
    analysisLimit: 15,
    analysisPeriodDays: 365,
    features: [
      '15 growth analyses per year',
      'PDF export',
      'Public share links',
      'Email support',
    ],
  },
  {
    tier: 'growth',
    name: 'Growth',
    priceInr: 2999,
    analysisLimit: 50,
    analysisPeriodDays: 365,
    features: [
      '50 growth analyses per year',
      'Everything in Starter',
      '9-channel social manager',
      'Priority queue',
      'Team seats (up to 5)',
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    priceInr: 7999,
    analysisLimit: 0, // unlimited
    analysisPeriodDays: 365,
    features: [
      'Unlimited analyses',
      'Everything in Growth',
      'API access',
      'Dedicated support',
      'Early access to new agents',
    ],
  },
]

/** Seed missing tier rows. Idempotent — safe to call on every boot. */
export async function seedSubscriptionSettings() {
  for (const d of DEFAULTS) {
    await SubscriptionSettings.updateOne(
      { tier: d.tier },
      { $setOnInsert: d },
      { upsert: true },
    )
  }
}
