import mongoose from 'mongoose'

const uploadSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true }, // original file name as user uploaded
    storedName: { type: String, required: true }, // sanitized + uuid prefix on disk
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    diskPath: { type: String, required: true }, // absolute path on server
    extractedTextLength: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['uploaded', 'parsing', 'chunking', 'ready', 'error'],
      default: 'uploaded',
      index: true,
    },
    error: { type: String, default: '' },
  },
  { timestamps: true },
)

uploadSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id
    delete ret._id
    delete ret.diskPath // never expose absolute server paths
    return ret
  },
})

export const Upload = mongoose.model('Upload', uploadSchema)
