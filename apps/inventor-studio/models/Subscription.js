import mongoose from 'mongoose'
import conn from '../db.js'

// Razorpay payment log per subscription event.
const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tier: { type: String, enum: ['tier1', 'tier2', 'tier3'], required: true },
    priceInr: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'manual', 'admin'],
      default: 'razorpay',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    paymentReference: { type: String, default: null },
    billingNumber: { type: String, unique: true, sparse: true },
    isActive: { type: Boolean, default: false, index: true },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
)

subscriptionSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const Subscription = conn.model('Subscription', subscriptionSchema)
