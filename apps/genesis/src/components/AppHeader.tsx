import { NavLink, Link } from 'react-router-dom'
import {
  FolderKanban,
  Play,
  ScrollText,
  CheckCircle,
  Settings,
  Monitor,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Projects', icon: FolderKanban },
  { to: '/runtime', label: 'Runtime', icon: Play },
  { to: '/audit', label: 'Audit', icon: ScrollText },
  { to: '/approvals', label: 'Approvals', icon: CheckCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1480px] mx-auto px-3 sm:px-4 md:px-6 h-9 flex items-center gap-2">
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <span className="h-5 w-5 rounded bg-gradient-to-br from-violet-400 to-blue-600 grid place-items-center text-white font-black text-[0.5rem]">
            AB
          </span>
          <span className="hidden sm:inline text-[0.7rem] font-semibold tracking-tight text-foreground">
            Genesis
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 ml-2">
          {NAV.map((item) => {
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
        </nav>

        <div className="flex-1 min-w-0" />

        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
          Genesis
        </span>

        <a
          href="/"
          className="ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.7rem] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors no-underline"
          title="Back to Desktop"
        >
          <Monitor size={14} strokeWidth={2} />
          <span className="hidden sm:inline">Desktop</span>
        </a>
      </div>

      <nav className="md:hidden border-t border-border px-3 py-0.5 flex gap-0.5 overflow-x-auto">
        {NAV.map((item) => {
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
