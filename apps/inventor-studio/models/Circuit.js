import mongoose from 'mongoose'
import conn from '../db.js'

// Electronics canvas — schematic + PCB nodes/edges (xyflow shape).
const circuitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    inventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invention',
      default: null,
      index: true,
    },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    schematic: { type: mongoose.Schema.Types.Mixed, default: { nodes: [], edges: [] } },
    pcb: { type: mongoose.Schema.Types.Mixed, default: { nodes: [], edges: [] } },
    bom: { type: [mongoose.Schema.Types.Mixed], default: [] },
    isPublic: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

circuitSchema.index({ userId: 1, createdAt: -1 })

circuitSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const Circuit = conn.model('Circuit', circuitSchema)
