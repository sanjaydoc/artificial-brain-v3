import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Upload, BarChart3, Globe, Crown, ArrowUpRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AppHeader } from '@/components/AppHeader'
import { subscriptionsApi, type MeSubscription } from '@/lib/api'

export default function Dashboard() {
  const { user } = useAuth()
  const [me, setMe] = useState<MeSubscription | null>(null)
  useEffect(() => {
    if (!user) return
    subscriptionsApi.me().then(setMe).catch(() => setMe(null))
    const onFocus = () => subscriptionsApi.me().then(setMe).catch(() => {})
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user])

  if (!user) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-3">Dashboard</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
        </motion.div>

        {/* Subscription plan card removed */}

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link to="/workspace" className="block">
            <PlaceholderCard
              icon={<Upload className="h-5 w-5 text-primary" />}
              title="Open your workspace"
              body="Upload PDFs, decks, spreadsheets. Paste your website + social URLs. Agents study them as context."
              cta="Open workspace →"
              active
            />
          </Link>
          <Link to="/reports" className="block">
            <PlaceholderCard
              icon={<BarChart3 className="h-5 w-5 text-primary" />}
              title="Your reports"
              body="Past growth analyses, plans, and cost-cut recommendations live here. Click to revisit any one."
              cta="Open reports →"
              active
            />
          </Link>
          <PlaceholderCard
            icon={<Globe className="h-5 w-5 text-primary" />}
            title="Connect your socials"
            body="Link 9 platforms — agents will post and engage on your behalf."
            cta="Coming in Phase 9"
          />
        </div>

        <div className="mt-10 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 md:p-8">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">You're early</h2>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
                Sentiance is rolling out one phase at a time. Auth is live (you're using it now). The
                file-upload + scrape pipeline ships next, then the multi-agent growth engine.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function SubscriptionCard({ me }: { me: MeSubscription }) {
  const isPaid = me.tier !== 'free'
  const limit = me.analysisLimit
  const used = me.analysisCount
  const remaining = limit === 0 ? '∞' : Math.max(0, limit - used)
  const periodLabel = me.periodResetAt
    ? `Resets ${new Date(me.periodResetAt).toLocaleDateString()}`
    : ''
  const expiry =
    me.tier !== 'free' && me.expiresAt
      ? `Renews ${new Date(me.expiresAt).toLocaleDateString()}`
      : ''
  return (
    <div className="mt-8 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 md:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="h-10 w-10 rounded-lg grid place-items-center bg-primary/15 border border-primary/30 shrink-0">
        <Crown className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Plan</p>
        <p className="mt-0.5 text-lg font-semibold text-foreground">
          {me.tierName}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            · {used} / {limit === 0 ? '∞' : limit} analyses used · {remaining} left
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {expiry || periodLabel}
        </p>
      </div>
      <Link
        to="/pricing"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors"
      >
        {isPaid ? 'Manage' : 'Upgrade'}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

function PlaceholderCard({
  icon,
  title,
  body,
  cta,
  active = false,
}: {
  icon: React.ReactNode
  title: string
  body: string
  cta: string
  active?: boolean
}) {
  return (
    <div
      className={`rounded-xl bg-card border p-4 transition-colors ${
        active ? 'border-primary/30 hover:border-primary/60' : 'border-border'
      }`}
    >
      <div className="h-10 w-10 rounded-lg grid place-items-center bg-primary/10 border border-primary/20 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
      <p
        className={`mt-4 text-xs uppercase tracking-[0.18em] ${
          active ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        {cta}
      </p>
    </div>
  )
}
