// Sentiance growth-plan PDF generator. Dark theme + gold accents — same visual
// language as the in-app Growth page. Uses jsPDF (sync, all on the client).
//
// Adapted from inventor-studio's generatePdf.js (proven battle-tested layout).
import { jsPDF } from 'jspdf'
import type { GrowthDoc, GrowthPlan } from '@/lib/api'

const PRIMARY = [245, 174, 15] as const // gold
const WHITE = [255, 255, 255] as const
const GRAY = [160, 160, 160] as const
const DARK = [10, 10, 14] as const
const GREEN = [74, 222, 128] as const
const CYAN = [34, 211, 238] as const

type RGB = readonly [number, number, number]

const LENS_LABELS: Record<string, string> = {
  Analogical: 'Analogical',
  Inversion: 'Inversion',
  'Cross-Domain': 'Cross-Domain',
  Extreme: 'Extreme',
  Historical: 'Historical',
  Biomimicry: 'Biomimicry',
  Combinatorial: 'Combinatorial',
  Reduction: 'Reduction',
  Scaling: 'Scaling',
  'Future-Back': 'Future-Back',
}

function darkPage(doc: jsPDF) {
  doc.addPage()
  doc.setFillColor(...(DARK as unknown as [number, number, number]))
  doc.rect(0, 0, 210, 297, 'F')
  doc.setFillColor(...(PRIMARY as unknown as [number, number, number]))
  doc.rect(0, 0, 6, 297, 'F')
}

function wrap(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 5) {
  const lines = doc.splitTextToSize(String(text || ''), maxWidth)
  for (const line of lines) {
    if (y > 275) {
      darkPage(doc)
      y = 20
    }
    doc.text(line, x, y)
    y += lineHeight
  }
  return y
}

function sectionHeader(doc: jsPDF, text: string, y: number) {
  if (y > 265) {
    darkPage(doc)
    y = 20
  }
  doc.setFillColor(...(PRIMARY as unknown as [number, number, number]))
  doc.rect(14, y - 4, 182, 7, 'F')
  doc.setTextColor(...(DARK as unknown as [number, number, number]))
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(text.toUpperCase(), 16, y)
  doc.setTextColor(...(WHITE as unknown as [number, number, number]))
  return y + 8
}

function divider(doc: jsPDF, y: number) {
  doc.setDrawColor(60, 60, 70)
  doc.line(14, y, 196, y)
  return y + 4
}

function scoreBar(doc: jsPDF, label: string, value: number, y: number, color: RGB) {
  const pctVal = (value || 0) * 100
  doc.setFontSize(8)
  doc.setTextColor(...(GRAY as unknown as [number, number, number]))
  doc.setFont('helvetica', 'normal')
  doc.text(label, 16, y)
  doc.setTextColor(...(WHITE as unknown as [number, number, number]))
  doc.text(`${Math.round(pctVal)}%`, 180, y, { align: 'right' })
  doc.setFillColor(40, 40, 50)
  doc.roundedRect(16, y + 1, 164, 3, 1, 1, 'F')
  doc.setFillColor(...(color as unknown as [number, number, number]))
  if (pctVal > 0) doc.roundedRect(16, y + 1, (164 * pctVal) / 100, 3, 1, 1, 'F')
  return y + 9
}

export function generateGrowthPdf(opts: {
  growth: GrowthDoc
  ownerHandle?: string // optional override (for public view), defaults to user's handle if available
}) {
  const { growth, ownerHandle } = opts
  const plan: Partial<GrowthPlan> = growth.plan || {}
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const title = plan.title || growth.concept.slice(0, 80) || 'Growth Plan'
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // ───────────────────────────── COVER PAGE ─────────────────────────────
  doc.setFillColor(...(DARK as unknown as [number, number, number]))
  doc.rect(0, 0, 210, 297, 'F')
  doc.setFillColor(...(PRIMARY as unknown as [number, number, number]))
  doc.rect(0, 0, 6, 297, 'F')

  // Logo + tagline
  doc.setTextColor(...(PRIMARY as unknown as [number, number, number]))
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('SENTIANCE  ·  ASI ARCHITECTURE', 20, 24)
  doc.setTextColor(...(GRAY as unknown as [number, number, number]))
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('GROWTH STRATEGY REPORT  ·  klabs.network', 20, 31)

  // Title block
  doc.setTextColor(...(WHITE as unknown as [number, number, number]))
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(title, 170)
  let ty = 80
  for (const l of titleLines) {
    doc.text(l, 20, ty)
    ty += 12
  }

  if (plan.oneLiner) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...(GRAY as unknown as [number, number, number]))
    const ol = doc.splitTextToSize(plan.oneLiner, 170)
    for (const l of ol) {
      doc.text(l, 20, ty)
      ty += 7
    }
  }

  // The user's actual concept (what they asked for)
  ty += 8
  doc.setTextColor(...(PRIMARY as unknown as [number, number, number]))
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('OWNER GOAL', 20, ty)
  ty += 5
  doc.setTextColor(...(WHITE as unknown as [number, number, number]))
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  ty = wrap(doc, growth.concept, 20, ty, 170, 6)

  // Scores
  ty = 200
  scoreBar(doc, 'Novelty', plan.noveltyScore || 0, ty, PRIMARY)
  scoreBar(doc, 'Impact', plan.impactScore || 0, ty + 9, GREEN)
  scoreBar(doc, 'Feasibility', plan.feasibilityScore || 0, ty + 18, CYAN)

  // Footer
  doc.setTextColor(...(GRAY as unknown as [number, number, number]))
  doc.setFontSize(7)
  doc.text(
    `Generated ${now}   ·   ${ownerHandle ? ownerHandle + '   ·   ' : ''}Report ID: ${growth.id}`,
    20,
    285,
  )

  // ─────────────────────────── EXECUTION PAGE ───────────────────────────
  darkPage(doc)
  let y = 20
  y = sectionHeader(doc, 'Execution Plan', y)
  y += 2

  if (plan.problemSolved) {
    doc.setTextColor(...(GRAY as unknown as [number, number, number]))
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('PROBLEM TO SOLVE', 16, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...(WHITE as unknown as [number, number, number]))
    y = wrap(doc, plan.problemSolved, 16, y, 178)
    y += 4
  }

  if (plan.growthOpportunities?.length) {
    y = divider(doc, y)
    doc.setTextColor(...(GRAY as unknown as [number, number, number]))
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('GROWTH OPPORTUNITIES', 16, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...(WHITE as unknown as [number, number, number]))
    for (const o of plan.growthOpportunities) {
      y = wrap(doc, `· ${o}`, 16, y, 178)
    }
    y += 4
  }

  if (plan.executionPlan?.length) {
    y = divider(doc, y)
    doc.setTextColor(...(GRAY as unknown as [number, number, number]))
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('PHASES', 16, y)
    y += 6

    plan.executionPlan.forEach((phase, pi) => {
      if (y > 260) {
        darkPage(doc)
        y = 20
      }
      // Phase header bar
      doc.setFillColor(30, 30, 42)
      doc.roundedRect(14, y - 4, 182, 8, 1, 1, 'F')
      doc.setTextColor(...(PRIMARY as unknown as [number, number, number]))
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(phase.phase, 16, y)
      if (phase.duration) {
        doc.setTextColor(...(GRAY as unknown as [number, number, number]))
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.text(phase.duration, 192, y, { align: 'right' })
      }
      y += 7
      doc.setFontSize(8)
      ;(phase.steps || []).forEach((step, si) => {
        if (y > 270) {
          darkPage(doc)
          y = 20
        }
        doc.setTextColor(...(CYAN as unknown as [number, number, number]))
        doc.setFont('helvetica', 'bold')
        doc.text(`${si + 1}.`, 18, y)
        doc.setTextColor(...(WHITE as unknown as [number, number, number]))
        doc.setFont('helvetica', 'normal')
        y = wrap(doc, step, 24, y, 168)
      })
      if (pi < (plan.executionPlan?.length || 0) - 1) y += 3
    })
    y += 4
  }

  // ─────────────────── COST STRUCTURE + COST CUTS ────────────────────
  if (plan.costStructure?.items?.length) {
    if (y > 220) {
      darkPage(doc)
      y = 20
    }
    y = divider(doc, y)
    doc.setTextColor(...(GRAY as unknown as [number, number, number]))
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('COST STRUCTURE', 16, y)
    y += 6

    plan.costStructure.items.forEach((item, i) => {
      if (y > 270) {
        darkPage(doc)
        y = 20
      }
      if (i % 2 === 0) {
        doc.setFillColor(28, 28, 38)
        doc.rect(14, y - 4, 182, item.notes ? 11 : 7, 'F')
      }
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...(WHITE as unknown as [number, number, number]))
      doc.setFontSize(8)
      doc.text(item.name, 16, y)
      doc.setTextColor(...(PRIMARY as unknown as [number, number, number]))
      doc.text(item.estimate || '', 192, y, { align: 'right' })
      if (item.notes) {
        y += 4
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...(GRAY as unknown as [number, number, number]))
        doc.setFontSize(7)
        y = wrap(doc, item.notes, 18, y, 168, 4)
      } else {
        y += 6
      }
    })
    if (plan.costStructure.totalEstimate) {
      if (y > 270) {
        darkPage(doc)
        y = 20
      }
      doc.setFillColor(...(PRIMARY as unknown as [number, number, number]))
      doc.roundedRect(14, y - 4, 182, 9, 1, 1, 'F')
      doc.setTextColor(...(DARK as unknown as [number, number, number]))
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('TOTAL ESTIMATE', 16, y)
      doc.text(plan.costStructure.totalEstimate, 192, y, { align: 'right' })
      y += 9
    }
  }

  if (plan.costCutOpportunities?.length) {
    y = divider(doc, y)
    doc.setTextColor(...(GREEN as unknown as [number, number, number]))
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('COST-CUT OPPORTUNITIES', 16, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    plan.costCutOpportunities.forEach((c) => {
      if (y > 270) {
        darkPage(doc)
        y = 20
      }
      doc.setTextColor(...(WHITE as unknown as [number, number, number]))
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`· ${c.name}`, 16, y)
      if (c.savings) {
        doc.setTextColor(...(GREEN as unknown as [number, number, number]))
        doc.setFont('helvetica', 'normal')
        doc.text(c.savings, 192, y, { align: 'right' })
      }
      y += 5
      if (c.how) {
        doc.setTextColor(...(GRAY as unknown as [number, number, number]))
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        y = wrap(doc, c.how, 20, y, 174, 4)
      }
      y += 2
    })
  }

  // ───────────── EXPERIMENTS, COMPETITORS, MARKET CONNECTIONS ─────────
  darkPage(doc)
  y = 20
  if (plan.nextExperiments?.length) {
    y = sectionHeader(doc, 'Week-1 Experiments', y)
    y += 2
    doc.setTextColor(...(WHITE as unknown as [number, number, number]))
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    plan.nextExperiments.forEach((e) => {
      y = wrap(doc, `· ${e}`, 16, y, 178)
    })
    y += 4
  }

  if (plan.timeToFirstResults) {
    y = divider(doc, y)
    doc.setTextColor(...(GRAY as unknown as [number, number, number]))
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Time to first results:', 16, y)
    doc.setTextColor(...(PRIMARY as unknown as [number, number, number]))
    doc.setFont('helvetica', 'normal')
    doc.text(plan.timeToFirstResults, 70, y)
    y += 8
  }

  if (plan.competitorAnalysis?.length) {
    y = divider(doc, y)
    doc.setTextColor(...(GRAY as unknown as [number, number, number]))
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('COMPETITORS / ANALOGS', 16, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...(WHITE as unknown as [number, number, number]))
    plan.competitorAnalysis.forEach((c) => {
      y = wrap(doc, `· ${c}`, 16, y, 178)
    })
    y += 4
  }

  if (plan.marketConnections?.length) {
    y = divider(doc, y)
    doc.setTextColor(...(GRAY as unknown as [number, number, number]))
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('MARKET CONNECTIONS / PARTNERS', 16, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...(WHITE as unknown as [number, number, number]))
    plan.marketConnections.forEach((c) => {
      y = wrap(doc, `· ${c}`, 16, y, 178)
    })
    y += 4
  }

  // ───────────── SYNTHESIS + CRITIQUE ─────────────
  if (growth.synthesis) {
    darkPage(doc)
    y = 20
    y = sectionHeader(doc, 'Synthesis', y)
    y += 2
    doc.setTextColor(...(WHITE as unknown as [number, number, number]))
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    y = wrap(doc, growth.synthesis, 16, y, 178)
  }

  if (growth.critique) {
    if (y > 240) {
      darkPage(doc)
      y = 20
    } else {
      y += 6
    }
    y = sectionHeader(doc, 'Critique', y)
    y += 2
    doc.setTextColor(...(WHITE as unknown as [number, number, number]))
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    y = wrap(doc, growth.critique, 16, y, 178)
  }

  // ───────────── 10 AGENT OUTPUTS ─────────────
  if (growth.agents?.length) {
    darkPage(doc)
    y = 20
    const responded = growth.agents.filter((a) => !a.error && a.output).length
    y = sectionHeader(doc, `Agent Reasoning  (${responded}/${growth.agents.length} responded)`, y)
    y += 4

    for (const a of growth.agents) {
      if (y > 250) {
        darkPage(doc)
        y = 20
      }
      const ok = !a.error && !!a.output
      doc.setFillColor(30, 30, 42)
      doc.roundedRect(14, y - 4, 182, 7, 2, 2, 'F')
      doc.setTextColor(...((ok ? CYAN : GRAY) as unknown as [number, number, number]))
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(LENS_LABELS[a.lens] || a.lens, 16, y)
      doc.setTextColor(...(GRAY as unknown as [number, number, number]))
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(
        ok ? `${(a.elapsedMs / 1000).toFixed(1)}s · ${a.provider || ''}` : 'no output',
        185,
        y,
        { align: 'right' },
      )
      y += 7

      if (ok) {
        doc.setTextColor(...(WHITE as unknown as [number, number, number]))
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        y = wrap(doc, a.output, 16, y, 178)
      } else {
        doc.setTextColor(80, 80, 90)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.text(`— ${a.error || 'Agent did not respond'} —`, 16, y)
        y += 5
      }
      y += 6
    }
  }

  // ───────────── PAGE NUMBERS ─────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setTextColor(...(GRAY as unknown as [number, number, number]))
    doc.setFontSize(7)
    doc.text(`${i} / ${pageCount}`, 196, 291, { align: 'right' })
    doc.text('SENTIANCE  ·  klabs.network', 14, 291)
  }

  const filename = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-growth.pdf`
  doc.save(filename)
}
