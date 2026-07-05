// Inventions CRUD + listing + detail + LLM-driven build-guide enrichment.

import { Router } from 'express'
import { Invention } from '../models/Invention.js'
import { DreamOutput } from '../models/DreamOutput.js'
import { CriticFeedback } from '../models/CriticFeedback.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { getComponents } from '../services/agents/componentsAgent.js'

// Hydrate an Invention doc with agents/critique from separate collections when
// the doc itself doesn't have them inline (old inventions ran before we started
// persisting these fields directly on the Invention).
async function hydrateInventionDoc(inv) {
  const json = inv.toJSON ? inv.toJSON() : inv
  const out = { ...json }

  // Agents — backfill from DreamOutput if empty
  if (!out.agents || Object.keys(out.agents).length === 0) {
    try {
      const outputs = await DreamOutput.find({ inventionId: inv._id || inv.id }).lean()
      out.agents = {}
      for (const o of outputs) out.agents[o.agentLens] = o.output
    } catch {}
  }

  // Critique — backfill from CriticFeedback if empty
  if (!out.critique) {
    try {
      const cf = await CriticFeedback.findOne({ inventionId: inv._id || inv.id }).lean()
      if (cf) {
        out.critique = {
          verdict: cf.verdict,
          reason: cf.reason,
          challenges: cf.challenge ? cf.challenge.split(';').map((s) => s.trim()) : [],
          finalNoveltyScore: cf.finalNoveltyScore || out.noveltyScore || 0,
        }
      }
    } catch {}
  }

  return out
}

const router = Router()

// ── POST /:id/components — build-guide enrichment (works for guest inventions) ─
// Delegates to services/agents/componentsAgent.js (which runs Searxng + LLM
// per-step to enrich each phase). Returns:
//   { hasRealData: true,  enrichedGuide: [{ phase, enrichedSteps: [...] }] }   on success
//   { hasRealData: false, enrichedGuide: [] }                                  on partial/empty fallback
router.post('/:id/components', optionalAuth, async (req, res) => {
  try {
    const inv = await Invention.findById(req.params.id)
    if (!inv) return res.status(404).json({ message: 'Not found' })

    // Authz: guest inventions are publicly viewable; others must belong to the caller.
    const isOwner = req.auth?.userId && String(inv.userId) === req.auth.userId
    if (!inv.isGuest && !isOwner) {
      return res.status(403).json({ message: 'Not your invention' })
    }

    // Schema stores everything under `inventionSpec`; older drafts may use
    // `mvpSpec` or top-level `spec`. Look in all three.
    const spec = inv.inventionSpec || inv.mvpSpec || inv.spec || {}
    const buildGuide = spec.buildGuide
    if (!Array.isArray(buildGuide) || buildGuide.length === 0) {
      return res.json({ hasRealData: false, enrichedGuide: [] })
    }

    const title = spec.title || inv.seedConcept || 'invention'
    const domain = spec.domain || inv.domain || 'other'

    const enrichedGuide = await getComponents(title, domain, buildGuide)

    // Real data = at least one step has packages/hardware/resources populated
    const hasRealData = enrichedGuide.some((p) =>
      (p.enrichedSteps || []).some(
        (s) =>
          (s.packages?.length || 0) > 0 ||
          (s.hardware?.length || 0) > 0 ||
          (s.resources?.length || 0) > 0,
      ),
    )

    // Persist back so subsequent loads have it
    try {
      const merged = { ...spec, enrichedGuide }
      await Invention.updateOne({ _id: inv._id }, { inventionSpec: merged })
    } catch (e) {
      console.warn('[inventions] components persist warn:', e?.message)
    }

    res.json({ hasRealData, enrichedGuide })
  } catch (err) {
    console.error('[inventions] components error:', err)
    res.json({ hasRealData: false, enrichedGuide: [], error: err.message })
  }
})

// ── GET /:id/export — invention as markdown (public for guest, owner-only otherwise) ─
router.get('/:id/export', optionalAuth, async (req, res) => {
  try {
    const inv = await Invention.findById(req.params.id)
    if (!inv) return res.status(404).json({ message: 'Not found' })
    const isOwner = req.auth?.userId && String(inv.userId) === req.auth.userId
    if (!inv.isGuest && !isOwner) return res.status(403).json({ message: 'Not your invention' })

    const spec = inv.mvpSpec || inv.spec || {}
    const created = inv.createdAt ? new Date(inv.createdAt).toLocaleString() : ''
    const ag = inv.agents || {}
    const synth = inv.synthesis
    const crit = inv.critique

    const md = [
      `# ${spec.title || inv.seedConcept || 'Invention'}`,
      ``,
      spec.oneLiner ? `> ${spec.oneLiner}` : '',
      ``,
      `**Domain:** ${spec.domain || inv.domain || '—'}  `,
      `**Seed:** ${inv.seedConcept || '—'}  `,
      `**Created:** ${created}  `,
      ``,
      spec.problemSolved ? `## Problem Solved\n\n${spec.problemSolved}\n` : '',
      spec.components?.length
        ? `## Components\n\n${spec.components.map((c) => `- ${c}`).join('\n')}\n`
        : '',
      spec.prototypeSteps?.length
        ? `## Prototype Steps\n\n${spec.prototypeSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
        : '',
      spec.buildGuide?.length
        ? `## Build Guide\n\n${spec.buildGuide
            .map(
              (p) =>
                `### ${p.phase}${p.duration ? ` (${p.duration})` : ''}\n\n${(p.steps || [])
                  .map((s, i) => `${i + 1}. ${s}`)
                  .join('\n')}`,
            )
            .join('\n\n')}\n`
        : '',
      spec.codeScaffold ? `## Code Scaffold\n\n\`\`\`\n${spec.codeScaffold}\n\`\`\`\n` : '',
      spec.nextExperiments?.length
        ? `## Next Experiments\n\n${spec.nextExperiments.map((e) => `- ${e}`).join('\n')}\n`
        : '',
      Object.keys(ag).length
        ? `## Dream Agents\n\n${Object.entries(ag)
            .map(([lens, output]) => `### ${lens}\n\n${output}`)
            .join('\n\n')}\n`
        : '',
      synth ? `## Synthesis\n\n\`\`\`json\n${JSON.stringify(synth, null, 2)}\n\`\`\`\n` : '',
      crit ? `## Critique\n\n\`\`\`json\n${JSON.stringify(crit, null, 2)}\n\`\`\`\n` : '',
      `---\nGenerated by Inventor Studio · ${new Date().toLocaleString()}`,
    ]
      .filter(Boolean)
      .join('\n')

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invention-${inv._id}.md"`,
    )
    res.send(md)
  } catch (err) {
    console.error('[inventions] export error:', err)
    res.status(500).json({ message: err.message })
  }
})

// ── GET /:id (public read for guest inventions) ───────────────────────────────
// Mounted BEFORE requireAuth so guest stream can refresh detail without a token.
router.get('/:id', async (req, res, next) => {
  try {
    const inv = await Invention.findById(req.params.id)
    if (!inv) return res.status(404).json({ message: 'Not found' })
    if (inv.isGuest) {
      const hydrated = await hydrateInventionDoc(inv)
      return res.json({ invention: hydrated })
    }
    // Not a guest invention — fall through to authed handler below
    return next()
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Everything below requires auth.
router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const items = await Invention.find({ userId: req.auth.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
    res.json({ inventions: items.map((i) => ({ ...i, id: String(i._id) })) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const inv = await Invention.findOne({ _id: req.params.id, userId: req.auth.userId })
    if (!inv) return res.status(404).json({ message: 'Not found' })
    const hydrated = await hydrateInventionDoc(inv)
    res.json({ invention: hydrated })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await Invention.deleteOne({ _id: req.params.id, userId: req.auth.userId })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.patch('/:id/visibility', async (req, res) => {
  try {
    const isPublic = !!req.body?.isPublic
    const inv = await Invention.findOneAndUpdate(
      { _id: req.params.id, userId: req.auth.userId },
      { isPublic },
      { new: true },
    )
    if (!inv) return res.status(404).json({ message: 'Not found' })
    res.json({ ok: true, isPublic, id: String(inv._id) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
