import mongoose from 'mongoose'

const ROLES = ['User', 'Admin']
const TIERS = ['free', 'tier1', 'tier2', 'tier3']

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    // Login methods (port from ASI-1 schema)
    passwordLoginEnabled: { type: Boolean, default: true },
    patternEnabled: { type: Boolean, default: false },
    patternHash: { type: String, default: null },
    biometricEnabled: { type: Boolean, default: false },
    biometricCredentialId: { type: String, default: null },
    biometricChallenge: { type: String, default: null },

    role: { type: String, enum: ROLES, default: 'User', index: true },

    // API key (v3 schema)
    apiKeyHash: { type: String, default: null },
    apiKeyPrefix: { type: String, default: null },

    // Subscription state
    subscriptionTier: { type: String, enum: TIERS, default: 'free', index: true },
    subscriptionExpiresAt: { type: Date, default: null },

    // Approval flow (some accounts go through admin approval)
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
  },
  { timestamps: true },
)

userSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    delete ret.passwordHash
    delete ret.patternHash
    delete ret.biometricChallenge
    delete ret.apiKeyHash
    return ret
  },
})

userSchema.statics.publicFields =
  '_id email role subscriptionTier subscriptionExpiresAt approvalStatus passwordLoginEnabled patternEnabled biometricEnabled createdAt updatedAt'

export const ROLES_ENUM = ROLES
export const TIERS_ENUM = TIERS
export const User = mongoose.model('User', userSchema)
