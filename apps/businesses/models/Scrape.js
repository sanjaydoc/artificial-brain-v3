import mongoose from 'mongoose'

const scrapeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    url: { type: String, required: true },
    kind: {
      type: String,
      enum: ['website', 'social'],
      default: 'website',
    },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    textLength: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['queued', 'fetching', 'parsing', 'chunking', 'ready', 'error'],
      default: 'queued',
      index: true,
    },
    error: { type: String, default: '' },
    httpStatus: { type: Number, default: 0 },
  },
  { timestamps: true },
)

scrapeSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id
    delete ret._id
    return ret
  },
})

export const Scrape = mongoose.model('Scrape', scrapeSchema)
