import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useBrain } from '@/context/BrainContext'
import { useAuth } from '@/context/AuthContext'
import {
  Home,
  MessageSquare,
  Brain,
  Bot,
  Database,
  Terminal,
  HardDrive,
  Settings,
  Layers,
  Monitor,
  Workflow,
  Wrench,
  Fingerprint,
  Activity,
  Shield,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/neural', label: 'Neural Map', icon: Brain },
  { to: '/robot', label: 'Robot', icon: Bot },
  { to: '/memory', label: 'Memory', icon: Database },
  { to: '/commands', label: 'Commands', icon: Terminal },
  { to: '/memory-mgmt', label: 'Memory Mgmt', icon: HardDrive },
  { to: '/config', label: 'Config', icon: Settings },
]

const LAYERS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/layer-orchestrator', label: 'Orchestrator', icon: Workflow },
  { to: '/layer-memory', label: 'Memory', icon: Database },
  { to: '/layer-tools', label: 'Tools', icon: Wrench },
  { to: '/layer-identity', label: 'Identity', icon: Fingerprint },
  { to: '/layer-observability', label: 'Observability', icon: Activity },
  { to: '/layer-guardrails', label: 'Guardrails', icon: Shield },
]

export function AppHeader() {
  const { connected } = useBrain()
  const { isAdmin } = useAuth()
  const [layersOpen, setLayersOpen] = useState(false)

  const visibleNav = NAV.filter(item => item.to !== '/config' || isAdmin)

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1480px] mx-auto px-3 sm:px-4 md:px-6 h-9 flex items-center gap-2">
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <span className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center text-white font-black text-[0.5rem] font-kanit">
            AB
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 ml-2">
          {visibleNav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.7rem] font-medium transition-colors ${
                    isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`
                }
              >
                <Icon size={14} strokeWidth={2} />
                {item.label}
              </NavLink>
            )
          })}
          <div className="relative">
            <button
              onClick={() => setLayersOpen(o => !o)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.7rem] font-medium transition-colors ${
                layersOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Layers size={14} strokeWidth={2} />
              Layers
            </button>
            {layersOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[160px]">
                {LAYERS.map(item => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setLayersOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-1.5 px-3 py-1.5 text-[0.7rem] transition-colors border-b border-border last:border-0 ${
                          isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`
                      }
                    >
                      <Icon size={14} strokeWidth={2} />
                      {item.label}
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="flex-1 min-w-0" />

        <span className={`inline-flex items-center gap-1 text-[0.55rem] font-mono ${connected ? 'text-emerald-600' : 'text-red-500'}`}>
          <span className={`status-dot ${connected ? 'status-dot-live' : 'status-dot-offline'}`} />
          {connected ? 'CONNECTED' : 'OFFLINE'}
        </span>

        <NavLink
          to="/"
          className="ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.7rem] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors no-underline"
        >
          <Monitor size={14} strokeWidth={2} />
          Desktop
        </NavLink>
      </div>

      <nav className="md:hidden border-t border-border px-3 py-0.5 flex gap-0.5 overflow-x-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[0.65rem] transition-colors ${
                  isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`
              }
            >
              <Icon size={13} strokeWidth={2} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </header>
  )
}
