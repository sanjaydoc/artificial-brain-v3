import mongoose from 'mongoose'

const ROLES = ['Business', 'Personal', 'Admin']

// Username = the slug before @klabs.network. Lowercase, alphanumeric, _ and -.
// Must start with a letter or digit. 3-30 chars.
const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{2,29}$/

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => USERNAME_RE.test(v),
        message: (props) =>
          `${props.value} is not a valid username (3-30 chars, a-z 0-9 _ -, must start alphanumeric)`,
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'Personal',
      required: true,
    },
    // Optional profile fields surfaced on the public klabs.network/<username> page
    displayName: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    websiteUrl: { type: String, default: '' },

    // ── Subscription state ─────────────────────────────────────────────────
    subscriptionTier: {
      type: String,
      enum: ['free', 'starter', 'growth', 'enterprise'],
      default: 'free',
      index: true,
    },
    subscriptionExpiresAt: { type: Date, default: null },
    // Period-bound usage counter — resets when subscription resets.
    periodAnalysisCount: { type: Number, default: 0 },
    periodResetAt: {
      type: Date,
      default: () => {
        // Free tier default — first day of next month
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth() + 1, 1)
      },
    },
  },
  { timestamps: true },
)

// Virtual: handle shown in UI as `username@klabs.network`
userSchema.virtual('handle').get(function () {
  return `${this.username}@klabs.network`
})

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.passwordHash
    delete ret._id
    delete ret.id
    return ret
  },
})

// Safe public projection (excludes passwordHash)
userSchema.statics.publicFields =
  '_id username email role displayName bio avatarUrl websiteUrl createdAt updatedAt'

export const ROLES_ENUM = ROLES
export const USERNAME_PATTERN = USERNAME_RE
export const User = mongoose.model('BizUser', userSchema)
