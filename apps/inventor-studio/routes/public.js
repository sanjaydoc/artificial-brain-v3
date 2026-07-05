// Public read-only routes — NO auth.
// /api/public/showcase — recent public inventions
// /api/public/invention/:id — single public invention

import { Router } from 'express'
import mongoose from 'mongoose'
import { Invention } from '../models/Invention.js'

const router = Router()

router.get('/showcase', async (_req, res) => {
  const items = await Invention.find({ isPublic: true, status: 'complete' })
    .select('title seedConcept domain noveltyScore impactScore feasibilityScore createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
  res.json({
    inventions: items.map((i) => ({
      id: String(i._id),
      title: i.title || i.seedConcept.slice(0, 80),
      seedConcept: i.seedConcept,
      domain: i.domain,
      noveltyScore: i.noveltyScore,
      feasibilityScore: i.feasibilityScore,
      impactScore: i.impactScore,
      createdAt: i.createdAt,
    })),
  })
})

router.get('/invention/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ message: 'Not found' })
  }
  const inv = await Invention.findOne({ _id: req.params.id, isPublic: true }).lean()
  if (!inv) return res.status(404).json({ message: 'Not found' })
  res.json({ invention: { ...inv, id: String(inv._id), userId: undefined } })
})

export default router
