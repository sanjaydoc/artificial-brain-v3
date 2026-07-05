import mongoose from 'mongoose'
import conn from '../db.js'

const inventionSourceSchema = new mongoose.Schema(
  {
    inventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invention',
      required: true,
      index: true,
    },
    title: { type: String, default: '' },
    url: { type: String, default: '' },
    sourceType: { type: String, default: '' }, // arxiv | pubmed | uspto | github | pubchem | web
    summary: { type: String, default: '' },
    relevanceScore: { type: Number, default: 0 },
  },
  { timestamps: true },
)

inventionSourceSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const InventionSource = conn.model('InventionSource', inventionSourceSchema)
