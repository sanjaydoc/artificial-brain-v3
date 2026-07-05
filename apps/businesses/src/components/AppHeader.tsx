import { Link, NavLink } from 'react-router-dom'
import {
  Home,
  LayoutDashboard,
  FolderOpen,
  TrendingUp,
  MessageSquare,
  FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/workspace', label: 'Workspace', icon: FolderOpen },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/growth', label: 'New Analysis', icon: TrendingUp },
  { to: '/reports', label: 'Reports', icon: FileText },
]

export function AppHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1480px] mx-auto px-3 sm:px-4 md:px-6 h-9 flex items-center gap-2">
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <span className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center text-white font-black text-[0.6rem] leading-none">
            AB
          </span>
          <span className="hidden xs:inline font-semibold tracking-tight text-foreground text-[0.7rem]">Businesses</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-2">
          {NAV.map((item) => (
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
              <item.icon size={14} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1 min-w-0" />

        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
          Artificial Brain
        </span>

        <a href="/" className="p-1.5 rounded-md hover:bg-accent transition-colors flex items-center gap-1.5" title="Back to Desktop">
          <Home size={14} strokeWidth={2} className="text-muted-foreground" />
          <span className="text-[0.7rem] text-muted-foreground hidden sm:inline">Desktop</span>
        </a>
      </div>

      {/* Mobile bottom nav strip */}
      <nav className="md:hidden border-t border-border px-3 py-1.5 flex gap-1 overflow-x-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.7rem] font-medium transition-colors ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`
            }
          >
            <item.icon size={13} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
