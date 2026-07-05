// Topic selection for the autonomous scheduler.
// Mongoose-backed; nextExperiments/graph_gap/domain_balance priority order
// preserved from ASI-1 src/autonomous/topicSelector.ts.

import { Invention } from '../../models/Invention.js'
import { AutonomousTopic } from '../../models/AutonomousTopic.js'

const SEED_TOPICS = [
  'carbon capture using synthetic biology',
  'neural interface for motor rehabilitation',
  'self-healing materials for flexible electronics',
  'quantum-classical hybrid computing architecture',
  'distributed energy storage using second-life batteries',
  'CRISPR-based point-of-care diagnostic tool',
  'swarm robotics for deep-sea mineral extraction',
  'photonic computing for low-power AI inference',
]

async function fromNextExperiments() {
  try {
    const docs = await Invention.find({
      status: 'complete',
      noveltyScore: { $gte: 0.6 },
      'inventionSpec.nextExperiments.0': { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('inventionSpec.nextExperiments _id')
      .lean()
    if (docs.length === 0) return null
    const doc = docs[0]
    const experiments = doc.inventionSpec?.nextExperiments || []
    if (experiments[0]) {
      return { concept: String(experiments[0]).trim(), source: 'next_experiments', parentInventionId: String(doc._id) }
    }
  } catch {}
  return null
}

async function fromDomainBalance() {
  try {
    const domains = ['software', 'hardware', 'life-science', 'hybrid']
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const last = await Invention.aggregate([
      { $match: { status: 'complete' } },
      { $group: { _id: '$domain', last: { $max: '$createdAt' } } },
    ])
    const map = {}
    for (const d of last) map[d._id] = d.last
    const stale = domains.find((d) => !map[d] || map[d] < oneDayAgo)
    if (!stale) return null
    const seeds = {
      software: 'distributed system for real-time edge AI inference',
      hardware: 'biomimetic exoskeleton with adaptive load distribution',
      'life-science': 'CRISPR-based biosensor for environmental toxin detection',
      hybrid: 'brain-computer interface using non-invasive dry electrodes',
    }
    return { concept: seeds[stale], source: 'domain_balance' }
  } catch {
    return null
  }
}

async function fromAutonomousTopics() {
  try {
    const t = await AutonomousTopic.findOneAndUpdate(
      { enabled: true },
      { $set: { lastUsedAt: new Date() }, $inc: { timesUsed: 1 } },
      { sort: { timesUsed: 1, lastUsedAt: 1 }, new: true },
    ).lean()
    if (t) return { concept: t.topic, source: 'autonomous_topic' }
  } catch {}
  return null
}

export async function selectNextTopic() {
  const topic = (await fromNextExperiments()) || (await fromAutonomousTopics()) || (await fromDomainBalance())
  if (topic) return topic
  return { concept: SEED_TOPICS[Math.floor(Math.random() * SEED_TOPICS.length)], source: 'fallback' }
}
