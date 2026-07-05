import { Link, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  Code,
  Cpu,
  Home,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inventions', label: 'Inventions', icon: Lightbulb },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/vibe', label: 'Vibe Code', icon: Code },
  { to: '/electronics', label: 'Electronics', icon: Cpu },
]

export function AppHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1480px] mx-auto px-3 sm:px-4 md:px-6 h-9 flex items-center gap-2">
        <Link to="/dashboard" className="flex items-center gap-1.5 shrink-0">
          <span className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center text-white font-black text-[0.5rem]">
            AB
          </span>
          <span className="hidden sm:inline text-[0.7rem] font-semibold tracking-tight text-foreground">
            Inventor Studio
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-2">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.7rem] font-medium transition-colors ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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
          ASI-1
        </span>

        <a
          href="/"
          className="p-1.5 rounded-md hover:bg-accent transition-colors flex items-center gap-1.5"
          title="Back to Desktop"
        >
          <Home size={14} strokeWidth={2} className="text-muted-foreground" />
          <span className="text-[0.7rem] text-muted-foreground hidden sm:inline">Desktop</span>
        </a>
      </div>

      {/* Mobile horizontal scroll nav */}
      <nav className="md:hidden border-t border-border px-3 py-1 flex gap-1 overflow-x-auto">
        {NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.65rem] font-medium transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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
