// One row per Razorpay payment / manual entry. Source of truth for billing
// history; the User doc holds the *current* tier + expiry.

import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tier: {
      type: String,
      enum: ['starter', 'growth', 'enterprise'],
      required: true,
    },
    priceInr: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'manual', 'admin'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    paymentReference: { type: String, default: '' }, // for manual UPI/bank UTR
    billingNumber: { type: String, unique: true, sparse: true },
    isActive: { type: Boolean, default: false, index: true },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
)

subscriptionSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id
    delete ret._id
    return ret
  },
})

export const Subscription = mongoose.model('Subscription', subscriptionSchema)
