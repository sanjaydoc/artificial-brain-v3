# Full UI Polish (Option D — Current Vibe Polished) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all emojis with Lucide icons, unify the AppHeader across all 4 apps, standardize cards/buttons/inputs/spinners/typography, and tighten every page for a consistent, professional dark+blue UI.

**Architecture:** Bottom-up approach — first lay the shared CSS foundation (design tokens, utility classes), then build shared component patterns, then sweep every page in each app. All 4 apps will look identical — same header, same card style, same everything.

**Tech Stack:** React 18, Tailwind CSS 3, Lucide React (already installed), CSS custom properties, Vite

---

## File Map

### Shared Foundation (root)
- Modify: `src/index.css` — add missing CSS variables, standardize utility classes
- Modify: `apps/businesses/src/index.css` — sync with root
- Modify: `apps/inventor-studio/src/index.css` — sync with root
- Modify: `apps/genesis/src/index.css` — sync with root

### AppHeader (all 4 apps)
- Modify: `src/components/AppHeader.tsx`
- Modify: `apps/businesses/src/components/AppHeader.tsx`
- Modify: `apps/inventor-studio/src/components/AppHeader.tsx`
- Modify: `apps/genesis/src/components/AppHeader.tsx`

### Root App Pages
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Chat.tsx`
- Modify: `src/pages/NeuralMap.tsx`
- Modify: `src/pages/Robot.tsx`
- Modify: `src/pages/Memory.tsx`
- Modify: `src/pages/MemoryManagement.tsx`
- Modify: `src/pages/Commands.tsx`
- Modify: `src/pages/Config.tsx`
- Modify: `src/pages/Admin.tsx`
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/Signup.tsx`
- Modify: `src/pages/layers/Orchestrator.tsx`
- Modify: `src/pages/layers/LayerMemory.tsx`
- Modify: `src/pages/layers/LayerTools.tsx`
- Modify: `src/pages/layers/Identity.tsx`
- Modify: `src/pages/layers/Observability.tsx`
- Modify: `src/pages/layers/Guardrails.tsx`
- Modify: `src/components/AgentCard.tsx`
- Modify: `src/components/ProtectedRoute.tsx`

### Businesses App Pages
- Modify: `apps/businesses/src/pages/Dashboard.tsx`
- Modify: `apps/businesses/src/pages/Chat.tsx`
- Modify: `apps/businesses/src/pages/Growth.tsx`
- Modify: `apps/businesses/src/pages/Reports.tsx`
- Modify: `apps/businesses/src/pages/Workspace.tsx`
- Modify: `apps/businesses/src/components/ProtectedRoute.tsx`
- Modify: `apps/businesses/src/components/ShareSheet.tsx`

### Inventor Studio Pages
- Modify: `apps/inventor-studio/src/pages/Dashboard.tsx`
- Modify: `apps/inventor-studio/src/pages/Chat.tsx`
- Modify: `apps/inventor-studio/src/pages/DreamStream.tsx`
- Modify: `apps/inventor-studio/src/pages/Inventions.tsx`
- Modify: `apps/inventor-studio/src/pages/InventionDetail.tsx`
- Modify: `apps/inventor-studio/src/pages/Electronics.tsx`
- Modify: `apps/inventor-studio/src/pages/CircuitCanvas.tsx`
- Modify: `apps/inventor-studio/src/pages/CircuitPublic.tsx`
- Modify: `apps/inventor-studio/src/pages/ShowcaseView.tsx`
- Modify: `apps/inventor-studio/src/pages/Vibe.tsx`
- Modify: `apps/inventor-studio/src/pages/AdminDashboard.tsx`
- Modify: `apps/inventor-studio/src/pages/Login.tsx`
- Modify: `apps/inventor-studio/src/pages/Signup.tsx`
- Modify: `apps/inventor-studio/src/pages/SetupLogin.tsx`
- Modify: `apps/inventor-studio/src/pages/PendingApproval.tsx`
- Modify: `apps/inventor-studio/src/pages/Welcome.tsx`
- Modify: `apps/inventor-studio/src/pages/GuestStream.tsx`
- Modify: `apps/inventor-studio/src/pages/Upgrade.tsx`
- Modify: `apps/inventor-studio/src/components/ProtectedRoute.tsx`
- Modify: `apps/inventor-studio/src/components/ShareSheet.tsx`
- Modify: `apps/inventor-studio/src/components/PatternLock.tsx`

### Genesis App Pages
- Modify: `apps/genesis/src/pages/Canvas.tsx`
- Modify: `apps/genesis/src/pages/ProjectPicker.tsx`
- Modify: `apps/genesis/src/pages/AgentDetail.tsx`
- Modify: `apps/genesis/src/pages/Approvals.tsx`
- Modify: `apps/genesis/src/pages/AuditTrail.tsx`
- Modify: `apps/genesis/src/pages/Runtime.tsx`
- Modify: `apps/genesis/src/pages/Settings.tsx`
- Modify: `apps/genesis/src/components/ConfigPanel.tsx`
- Modify: `apps/genesis/src/components/Sidebar.tsx`
- Modify: `apps/genesis/src/components/TemplateGallery.tsx`

---

## Task 1: Standardize CSS Design Tokens & Utility Classes

**Files:**
- Modify: `src/index.css`
- Modify: `apps/businesses/src/index.css`
- Modify: `apps/inventor-studio/src/index.css`
- Modify: `apps/genesis/src/index.css`

**Goal:** All 4 apps share identical CSS variables and utility classes. Add missing tokens, remove dead code, ensure both light and dark themes are fully covered.

- [ ] **Step 1: Update root `src/index.css` — add missing variables and standardized utility classes**

Add these new variables inside `:root` and `.dark` blocks, and add standardized utility classes after the existing `@layer base` block:

```css
/* Add to :root block after existing variables */
  --card-hover: #f0f1f2;
  --glow: rgba(28, 156, 240, 0.15);
  --success: #22c55e;
  --success-foreground: #ffffff;
  --warning: #f59e0b;
  --warning-foreground: #ffffff;

/* Add to .dark block after existing variables */
  --card-hover: #1e1f23;
  --glow: rgba(28, 156, 240, 0.2);
  --success: #22c55e;
  --success-foreground: #ffffff;
  --warning: #f59e0b;
  --warning-foreground: #ffffff;
```

Add standardized utility classes after the existing `@layer base` block:

```css
/* ── Standardized UI Components ──────────────────────────────── */

.btn-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-family: 'Kanit', sans-serif;
  font-weight: 600;
  font-size: 0.8rem;
  transition: all 0.15s ease;
  cursor: pointer;
  border: none;
  outline: none;
}
.btn-base:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  composes: btn-base;
  background: var(--primary);
  color: var(--primary-foreground);
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-secondary {
  composes: btn-base;
  background: var(--muted);
  color: var(--foreground);
  border: 1px solid var(--border);
}
.btn-secondary:hover:not(:disabled) {
  background: var(--accent);
}

.btn-ghost {
  composes: btn-base;
  background: transparent;
  color: var(--muted-foreground);
}
.btn-ghost:hover:not(:disabled) {
  background: var(--accent);
  color: var(--foreground);
}

.btn-destructive {
  composes: btn-base;
  background: var(--destructive);
  color: var(--destructive-foreground);
}
.btn-destructive:hover:not(:disabled) {
  opacity: 0.9;
}

.input-field {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  font-family: 'Poppins', sans-serif;
  background: var(--input);
  color: var(--foreground);
  outline: none;
  transition: border-color 0.15s ease;
}
.input-field:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--glow);
}
.input-field::placeholder {
  color: var(--muted-foreground);
}

.card-standard {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.625rem;
  padding: 1rem;
  transition: all 0.15s ease;
}
.card-standard:hover {
  background: var(--card-hover);
}

.card-interactive {
  composes: card-standard;
  cursor: pointer;
}
.card-interactive:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dark .card-interactive:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.loader-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.loader-spinner-lg {
  width: 1.5rem;
  height: 1.5rem;
  border-width: 2.5px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.status-dot-live {
  background: var(--success);
  box-shadow: 0 0 6px color-mix(in srgb, var(--success) 40%, transparent);
}
.status-dot-offline {
  background: var(--destructive);
}

.section-title {
  font-family: 'Kanit', sans-serif;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--foreground);
}

.section-label {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.mono-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
}
```

Remove the dead `.loader` class (32px spinner never used in TSX) and the psi-animation keyframes that are only used in one place (move those inline if needed).

- [ ] **Step 2: Copy the same utility classes into all 3 sub-app CSS files**

Copy the exact same new variables and utility class block into:
- `apps/businesses/src/index.css`
- `apps/inventor-studio/src/index.css`
- `apps/genesis/src/index.css`

Each sub-app already has `:root` / `.dark` blocks and their own utility classes. Replace the existing `btn-primary`, `btn-secondary`, `input-field` definitions (which use `2px solid` borders and `12px` border-radius — inconsistent with the new standard) with the new versions above. Keep any app-specific CSS that doesn't conflict (e.g., genesis ReactFlow overrides).

- [ ] **Step 3: Remove hardcoded light-mode colors from inventor-studio CSS**

In `apps/inventor-studio/src/index.css`, search for any hardcoded colors like `#f8fafc`, `border-white/5`, `border-white/10` etc. and replace with token-based equivalents using `var(--border)`, `var(--card)`, etc.

- [ ] **Step 4: Verify both themes render correctly**

Run: `npm run dev`
Open `http://localhost:5173` in browser. Toggle dark/light mode. Verify:
- All CSS variables resolve in both themes
- No visual breakage from the utility class changes
- Cards, buttons, inputs all use the new standard styles where they reference the CSS classes

- [ ] **Step 5: Commit**

```bash
git add src/index.css apps/businesses/src/index.css apps/inventor-studio/src/index.css apps/genesis/src/index.css
git commit -m "style: standardize CSS design tokens and utility classes across all 4 apps"
```

---

## Task 2: Unify Root AppHeader — Replace Emojis with Lucide Icons

**Files:**
- Modify: `src/components/AppHeader.tsx`

**Goal:** Replace all emoji nav icons with Lucide React icons. Tighten layout, add proper active states.

- [ ] **Step 1: Rewrite the NAV array and imports**

Replace the emoji-based NAV array and update the component. Here is the full replacement for `src/components/AppHeader.tsx`:

```tsx
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
  Workflow,
  Wrench,
  Fingerprint,
  Activity,
  Shield,
  Monitor,
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/neural', label: 'Neural Map', icon: Brain },
  { to: '/robot', label: 'Robot', icon: Bot },
  { to: '/memory', label: 'Memory', icon: Database },
  { to: '/commands', label: 'Commands', icon: Terminal },
  { to: '/memory-mgmt', label: 'Memory Mgmt', icon: HardDrive },
  { to: '/config', label: 'Config', icon: Settings },
]

const LAYER_NAV = [
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

          {/* Layers dropdown */}
          <div className="relative">
            <button
              onClick={() => setLayersOpen(o => !o)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.7rem] font-medium transition-colors ${
                layersOpen
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Layers size={14} strokeWidth={2} />
              Layers
            </button>
            {layersOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[180px]">
                {LAYER_NAV.map(item => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setLayersOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 text-[0.7rem] transition-colors border-b border-border last:border-0 ${
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
              </div>
            )}
          </div>
        </nav>

        <div className="flex-1 min-w-0" />

        <span className={`inline-flex items-center gap-1.5 text-[0.6rem] font-mono ${connected ? 'text-emerald-600' : 'text-red-500'}`}>
          <span className={`status-dot ${connected ? 'status-dot-live' : 'status-dot-offline'}`} />
          {connected ? 'CONNECTED' : 'OFFLINE'}
        </span>

        <NavLink
          to="/"
          className="ml-2 flex items-center gap-1.5 px-2 py-1 rounded-md text-[0.65rem] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors no-underline"
        >
          <Monitor size={13} strokeWidth={2} />
          Desktop
        </NavLink>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden border-t border-border px-3 py-1 flex gap-0.5 overflow-x-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[0.65rem] transition-colors ${
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
```

- [ ] **Step 2: Verify in browser**

Run dev server, navigate between pages. Check:
- All nav icons render as Lucide SVGs (no emojis)
- Active state highlights correctly
- Layers dropdown works with icons
- Mobile nav scrolls correctly
- Status dot uses the new CSS class

- [ ] **Step 3: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "style: replace emoji nav icons with Lucide in root AppHeader"
```

---

## Task 3: Unify Businesses AppHeader

**Files:**
- Modify: `apps/businesses/src/components/AppHeader.tsx`

- [ ] **Step 1: Read the current file and rewrite with Lucide icons**

Read `apps/businesses/src/components/AppHeader.tsx` to understand its current nav structure. Rewrite following the exact same pattern as the root AppHeader from Task 2, but with the businesses-specific nav items:

```tsx
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  FolderOpen,
  TrendingUp,
  MessageSquare,
  FileText,
} from 'lucide-react'

const NAV = [
  { to: '/businesses', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/businesses/workspace', label: 'Workspace', icon: FolderOpen },
  { to: '/businesses/growth', label: 'Growth', icon: TrendingUp },
  { to: '/businesses/chat', label: 'Chat', icon: MessageSquare },
  { to: '/businesses/reports', label: 'Reports', icon: FileText },
]

export function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1480px] mx-auto px-3 sm:px-4 md:px-6 h-9 flex items-center gap-2">
        <Link to="/businesses" className="flex items-center gap-1.5 shrink-0">
          <span className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center text-white font-black text-[0.5rem] font-kanit">
            AB
          </span>
          <span className="text-[0.7rem] font-kanit font-semibold text-foreground hidden sm:inline">
            Businesses
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 ml-2">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/businesses'}
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

        {user && (
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] text-muted-foreground font-mono">{user.email}</span>
            <button
              onClick={logout}
              className="text-[0.65rem] text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      <nav className="md:hidden border-t border-border px-3 py-1 flex gap-0.5 overflow-x-auto">
        {NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/businesses'}
              className={({ isActive }) =>
                `shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[0.65rem] transition-colors ${
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
```

Adapt the nav items and auth UI based on what the current file actually contains (the user/logout display may differ). The key changes are: same height (h-9), same icon pattern, same active states, same mobile nav.

- [ ] **Step 2: Verify in browser at `/businesses`**

- [ ] **Step 3: Commit**

```bash
git add apps/businesses/src/components/AppHeader.tsx
git commit -m "style: replace emoji nav icons with Lucide in businesses AppHeader"
```

---

## Task 4: Unify Inventor Studio AppHeader

**Files:**
- Modify: `apps/inventor-studio/src/components/AppHeader.tsx`

- [ ] **Step 1: Read the current file and rewrite with Lucide icons**

Follow the exact same pattern as Tasks 2-3. Inventor Studio has more nav items. Use appropriate Lucide icons:

```
Dashboard → LayoutDashboard
Inventions → Lightbulb
Dream → Sparkles
Chat → MessageSquare
Vibe → Code
Electronics → Cpu
Stream → Radio
```

Same header height (h-9), same active state pattern, same mobile nav. Keep any inventor-studio-specific features (admin link, agent status indicator) but render them with the same visual treatment.

- [ ] **Step 2: Verify in browser at `/inventor-studio`**

- [ ] **Step 3: Commit**

```bash
git add apps/inventor-studio/src/components/AppHeader.tsx
git commit -m "style: replace emoji nav icons with Lucide in inventor-studio AppHeader"
```

---

## Task 5: Unify Genesis AppHeader

**Files:**
- Modify: `apps/genesis/src/components/AppHeader.tsx`

- [ ] **Step 1: Read the current file and rewrite with Lucide icons**

Same pattern. Genesis nav items:

```
Projects → FolderKanban
Canvas → PenTool
Agents → Users
Approvals → CheckCircle
Audit Trail → ScrollText
Runtime → Play
Settings → Settings
```

- [ ] **Step 2: Verify in browser at `/genesis`**

- [ ] **Step 3: Commit**

```bash
git add apps/genesis/src/components/AppHeader.tsx
git commit -m "style: replace emoji nav icons with Lucide in genesis AppHeader"
```

---

## Task 6: Replace Emojis in Root App Pages

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/layers/LayerTools.tsx`

**Goal:** Remove the last remaining emojis from root app pages.

- [ ] **Step 1: Fix Home.tsx — replace dark mode toggle emojis**

In `src/pages/Home.tsx`, find the dark mode toggle button that uses `{darkMode ? '☀️' : '🌙'}` (around line 409). Replace with Lucide icons:

```tsx
import { Sun, Moon } from 'lucide-react'

// In the toggle button JSX, replace the emoji ternary with:
{darkMode ? <Sun size={14} /> : <Moon size={14} />}
```

Also check the desktop app icon grid — if any icons use emojis instead of SVG/image sources, replace them with Lucide icons or proper SVG elements matching the professional desktop style.

- [ ] **Step 2: Fix LayerTools.tsx — replace key group emojis**

In `src/pages/layers/LayerTools.tsx`, find the key group data arrays (around lines 141, 182, 211, 309, 496, 608) that use emojis `🧠`, `🗄️`, `🔧`, `⚙️`, `🚫`. Replace each with a Lucide icon component:

```tsx
import { Brain, Database, Wrench, Settings, Ban } from 'lucide-react'

// In the key group data, change icon from string emoji to JSX:
// Before: { name: 'Brain Keys', icon: '🧠', ... }
// After:  { name: 'Brain Keys', icon: <Brain size={14} />, ... }

// For the blocked tool indicator (line ~608):
// Before: {blocked ? '🚫 ' : ''}
// After:  {blocked && <Ban size={12} className="inline text-destructive mr-1" />}
```

Update the rendering code that displays `icon` to handle JSX elements instead of string characters.

- [ ] **Step 3: Verify both pages in browser**

Check Home page dark mode toggle, check LayerTools key groups render icons correctly.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.tsx src/pages/layers/LayerTools.tsx
git commit -m "style: replace remaining emojis with Lucide icons in root app pages"
```

---

## Task 7: Replace Emojis in Inventor Studio Pages

**Files:**
- Modify: `apps/inventor-studio/src/pages/AdminDashboard.tsx`
- Modify: `apps/inventor-studio/src/pages/DreamStream.tsx`
- Modify: `apps/inventor-studio/src/pages/InventionDetail.tsx`
- Modify: `apps/inventor-studio/src/pages/ShowcaseView.tsx`
- Modify: `apps/inventor-studio/src/pages/PendingApproval.tsx`
- Modify: `apps/inventor-studio/src/pages/Welcome.tsx`

- [ ] **Step 1: Fix AdminDashboard.tsx**

Replace auth status emojis (🔒 👆 🔑) at line ~356 with Lucide icons:

```tsx
import { Lock, Fingerprint, Key } from 'lucide-react'

// Before: {u.patternEnabled ? '🔒' : '·'} {u.biometricEnabled ? '👆' : '·'} 🔑
// After:
{u.patternEnabled && <Lock size={12} className="inline text-primary" />}
{u.biometricEnabled && <Fingerprint size={12} className="inline text-primary" />}
<Key size={12} className="inline text-muted-foreground" />
```

- [ ] **Step 2: Fix DreamStream.tsx**

Replace `✓` in the addLog call (line ~448) with text `[done]` or a simple `✓` is acceptable as it's a console log string, not a UI icon. If it's rendered visually, replace with:

```tsx
import { Check } from 'lucide-react'
// Use <Check size={12} className="inline text-success" /> where rendered in JSX
```

- [ ] **Step 3: Fix InventionDetail.tsx and ShowcaseView.tsx**

Both files use `✗` and `✓` as list item prefixes for pros/cons. Replace with Lucide:

```tsx
import { Check, X } from 'lucide-react'

// Before: <span className="text-green-500">✓</span>
// After:  <Check size={14} className="text-green-500" />

// Before: <span className="text-red-500">✗</span>
// After:  <X size={14} className="text-red-500" />
```

- [ ] **Step 4: Fix PendingApproval.tsx**

Replace `⏳` in toast message (line ~141):

```tsx
import { Clock } from 'lucide-react'
// If it's just a string in a toast, replace with text: "Still pending — check again later"
// If rendered as JSX, use: <Clock size={14} className="inline text-warning" />
```

- [ ] **Step 5: Fix Welcome.tsx**

Replace `☰` hamburger (line ~442) with Lucide `Menu`:

```tsx
import { Menu } from 'lucide-react'
// Before: <span style={{ fontSize: 20 }}>☰</span>
// After:  <Menu size={20} />
```

Replace `✓` in terminal lines (lines ~259, 262, 268) — these are decorative terminal text, so simple text `[ok]` or keeping `✓` as text content is fine since it's in a simulated terminal output, not a UI control.

- [ ] **Step 6: Verify all pages in browser**

- [ ] **Step 7: Commit**

```bash
git add apps/inventor-studio/src/pages/AdminDashboard.tsx apps/inventor-studio/src/pages/DreamStream.tsx apps/inventor-studio/src/pages/InventionDetail.tsx apps/inventor-studio/src/pages/ShowcaseView.tsx apps/inventor-studio/src/pages/PendingApproval.tsx apps/inventor-studio/src/pages/Welcome.tsx
git commit -m "style: replace all emojis with Lucide icons in inventor-studio pages"
```

---

## Task 8: Standardize Loading/Spinner Patterns

**Files:**
- Modify: `apps/inventor-studio/src/pages/CircuitCanvas.tsx`
- Modify: `apps/inventor-studio/src/pages/CircuitPublic.tsx`
- Modify: `apps/inventor-studio/src/pages/ShowcaseView.tsx`
- Modify: `src/components/ProtectedRoute.tsx`
- Modify: `apps/businesses/src/components/ProtectedRoute.tsx`
- Modify: `apps/inventor-studio/src/components/ProtectedRoute.tsx`

**Goal:** Replace all inline `style={}` spinners and plain "Loading…" text with the standardized `loader-spinner` CSS class or Lucide `Loader2` with `animate-spin`. Use `Loader2` consistently (not `Loader`).

- [ ] **Step 1: Fix CircuitCanvas.tsx and CircuitPublic.tsx — remove inline style spinners**

Find the inline `style={}` spinners with hardcoded `#3b82f6`, `#f8fafc`. Replace with:

```tsx
// Before:
// <div style={{ width: 36, height: 36, border: '3px solid rgba(...)', borderTop: '#3b82f6', ... }}>
// After:
<div className="loader-spinner loader-spinner-lg" />
```

Also replace any hardcoded background colors like `style={{ background: '#f8fafc' }}` with `className="bg-background"`.

- [ ] **Step 2: Fix ShowcaseView.tsx — remove inline style spinner and hardcoded bg**

Same pattern as Step 1. Replace inline spinners and `#f8fafc` backgrounds.

- [ ] **Step 3: Fix all ProtectedRoute.tsx files — replace "Loading…" text with spinner**

In all 3 `ProtectedRoute.tsx` files, replace the loading state:

```tsx
// Before:
// <div className="min-h-screen grid place-items-center text-neutral-500 text-sm">Loading…</div>
// After:
<div className="min-h-screen grid place-items-center">
  <div className="loader-spinner loader-spinner-lg" />
</div>
```

- [ ] **Step 4: Global find-replace — change all `Loader` imports to `Loader2`**

Search across all apps for `import { Loader }` (without the `2`) and replace with `import { Loader2 }`. Also update any JSX usage of `<Loader` to `<Loader2`. This ensures only one spinner icon is used.

Do NOT change imports that already use `Loader2`.

- [ ] **Step 5: Verify loading states in browser**

Navigate to pages that show loading states (CircuitCanvas, any ProtectedRoute redirect). Confirm spinners render correctly in both light and dark mode.

- [ ] **Step 6: Commit**

```bash
git add apps/inventor-studio/src/pages/CircuitCanvas.tsx apps/inventor-studio/src/pages/CircuitPublic.tsx apps/inventor-studio/src/pages/ShowcaseView.tsx src/components/ProtectedRoute.tsx apps/businesses/src/components/ProtectedRoute.tsx apps/inventor-studio/src/components/ProtectedRoute.tsx
git commit -m "style: standardize all loading spinners across apps"
```

---

## Task 9: Polish Root App Pages — Cards, Buttons, Inputs, Typography

**Files:**
- Modify: `src/pages/Chat.tsx`
- Modify: `src/pages/NeuralMap.tsx`
- Modify: `src/pages/Robot.tsx`
- Modify: `src/pages/Memory.tsx`
- Modify: `src/pages/MemoryManagement.tsx`
- Modify: `src/pages/Commands.tsx`
- Modify: `src/pages/Config.tsx`
- Modify: `src/pages/Admin.tsx`
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/Signup.tsx`
- Modify: `src/components/AgentCard.tsx`

**Goal:** Sweep every root page and standardize:
- Card radius: `rounded-[10px]` (0.625rem) everywhere — replace `rounded-2xl`, `rounded-[5px]`, `rounded-[28px]`, `rounded-[14px]`
- Card padding: `p-4` standard, `p-5` for feature cards
- Button padding: `px-3 py-1.5` for small, `px-4 py-2` for standard — no other variants
- Input styling: use `input-field` class or `rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-glow outline-none`
- Font sizes: replace arbitrary `text-[10px]`, `text-[0.45rem]`, `text-[9px]` with `text-[0.6rem]` minimum
- Section titles: use `section-title` class
- Labels: use `section-label` class
- Monospace values: use `mono-value` class
- Destructive buttons: use `bg-destructive/10 border border-destructive/20 text-destructive` (not hardcoded `bg-red-50`)

- [ ] **Step 1: Read each page file**

Read all 11 files listed above to understand current styling patterns.

- [ ] **Step 2: Standardize Chat.tsx**

Key changes:
- Message bubbles: consistent `rounded-[10px]` radius
- Input area: use `input-field` class
- Send button: use standardized primary button classes
- Agent card wrapper: consistent card styling
- Replace any `text-[10px]` or `text-[9px]` with `text-[0.6rem]`

- [ ] **Step 3: Standardize NeuralMap.tsx**

Key changes:
- Node status cards in right panel: `card-standard` class
- Signal log entries: consistent font sizes
- Keep the SVG neural map as-is (it's custom and works well)
- Add subtle glow to active nodes: `filter: drop-shadow(0 0 6px var(--primary))`

- [ ] **Step 4: Standardize Robot.tsx**

Key changes:
- Camera feed card, command input, emotion buttons, joint bars: all use `card-standard`
- Quick command buttons: consistent `btn-ghost` or `btn-secondary` sizing
- Stats display: `mono-value` class
- Keep the NeuralMap-like glow effects here (this is a "wow" page)

- [ ] **Step 5: Standardize Memory.tsx and MemoryManagement.tsx**

Key changes:
- Filter dropdowns: consistent select styling
- Memory entry cards: `card-standard`
- Stats cards: consistent layout (label → value → bar)
- Danger zone buttons: use token-based destructive colors

- [ ] **Step 6: Standardize Commands.tsx**

Key changes:
- Tool cards: `card-standard` with consistent padding
- Category sidebar buttons: consistent active state
- Search input: `input-field` class
- Tool grid: consistent gap and card radius

- [ ] **Step 7: Standardize Config.tsx**

Key changes:
- Tab buttons: consistent active states
- Node config cards: `card-standard`
- Sliders: consistent width and label sizing
- Preset cards: consistent `card-interactive` style
- Admin-only sections: consistent destructive button styling

- [ ] **Step 8: Standardize Admin.tsx**

Key changes:
- Stats cards: consistent layout
- User table: consistent header/row styling
- Select dropdowns: consistent styling
- Delete button: token-based destructive colors

- [ ] **Step 9: Standardize Login.tsx and Signup.tsx**

Key changes:
- Form card: centered, consistent `card-standard` wrapper
- Input fields: `input-field` class
- Submit button: `btn-primary` class
- Error message: consistent `text-destructive text-[0.7rem]`

- [ ] **Step 10: Standardize AgentCard.tsx**

Key changes:
- Card wrapper: use `card-standard` base with primary accent border
- Role badge: consistent sizing
- Run button: `btn-secondary` sizing
- Error message: consistent destructive styling

- [ ] **Step 11: Verify all pages in browser — navigate through every route**

Check each page in both light and dark mode. Verify:
- Consistent card radius and padding
- Consistent button sizes
- Consistent input focus states
- No hardcoded light-mode-only colors
- Minimum font size is `text-[0.6rem]` (no `text-[10px]` or smaller)

- [ ] **Step 12: Commit**

```bash
git add src/pages/ src/components/AgentCard.tsx
git commit -m "style: standardize cards, buttons, inputs, and typography across all root pages"
```

---

## Task 10: Polish Root Layer Pages

**Files:**
- Modify: `src/pages/layers/Orchestrator.tsx`
- Modify: `src/pages/layers/LayerMemory.tsx`
- Modify: `src/pages/layers/LayerTools.tsx`
- Modify: `src/pages/layers/Identity.tsx`
- Modify: `src/pages/layers/Observability.tsx`
- Modify: `src/pages/layers/Guardrails.tsx`

**Goal:** Same standardization as Task 9, applied to all 6 layer pages.

- [ ] **Step 1: Read all 6 layer page files**

- [ ] **Step 2: Standardize each page**

Apply the same patterns:
- Cards: `card-standard` class, `rounded-[10px]`, `p-4`
- Buttons: standardized sizing
- Inputs/selects: `input-field` class
- Sliders: consistent styling
- Tables: consistent header/row styling
- Labels: `section-label` class
- Section titles: `section-title` class
- Replace any remaining emojis (already done in Task 6 for LayerTools)

- [ ] **Step 3: Verify all 6 layer pages in browser**

- [ ] **Step 4: Commit**

```bash
git add src/pages/layers/
git commit -m "style: standardize cards, buttons, inputs across all layer pages"
```

---

## Task 11: Polish Businesses App Pages

**Files:**
- Modify: `apps/businesses/src/pages/Dashboard.tsx`
- Modify: `apps/businesses/src/pages/Chat.tsx`
- Modify: `apps/businesses/src/pages/Growth.tsx`
- Modify: `apps/businesses/src/pages/Reports.tsx`
- Modify: `apps/businesses/src/pages/Workspace.tsx`
- Modify: `apps/businesses/src/components/ShareSheet.tsx`

**Goal:** Align businesses app styling with the root app standard.

- [ ] **Step 1: Read all 6 files**

- [ ] **Step 2: Standardize each page**

Key businesses-specific changes:
- Cards: `p-4` instead of `p-6` (too spacious). `rounded-[10px]` instead of `rounded-2xl`
- Primary buttons: `px-4 py-2 text-sm` (not `px-4 py-2.5` or `px-5 py-2.5`)
- Chat bubbles: keep the custom `rounded-[4px_16px_16px_16px]` — this is intentional for chat UIs
- Inputs: use the standardized `input-field` pattern — `1px` border, `rounded-lg`, consistent focus
- ShareSheet modal: consistent card and button styling
- Growth page: standardize the strategy cards
- Reports page: standardize the export buttons
- Workspace file list: consistent card and action button styling

- [ ] **Step 3: Verify all businesses pages at `/businesses/*`**

- [ ] **Step 4: Commit**

```bash
git add apps/businesses/src/pages/ apps/businesses/src/components/ShareSheet.tsx
git commit -m "style: standardize cards, buttons, inputs across businesses app pages"
```

---

## Task 12: Polish Inventor Studio App Pages

**Files:**
- Modify: `apps/inventor-studio/src/pages/Dashboard.tsx`
- Modify: `apps/inventor-studio/src/pages/Chat.tsx`
- Modify: `apps/inventor-studio/src/pages/DreamStream.tsx`
- Modify: `apps/inventor-studio/src/pages/Inventions.tsx`
- Modify: `apps/inventor-studio/src/pages/InventionDetail.tsx`
- Modify: `apps/inventor-studio/src/pages/Electronics.tsx`
- Modify: `apps/inventor-studio/src/pages/CircuitCanvas.tsx`
- Modify: `apps/inventor-studio/src/pages/CircuitPublic.tsx`
- Modify: `apps/inventor-studio/src/pages/ShowcaseView.tsx`
- Modify: `apps/inventor-studio/src/pages/Vibe.tsx`
- Modify: `apps/inventor-studio/src/pages/AdminDashboard.tsx`
- Modify: `apps/inventor-studio/src/pages/Login.tsx`
- Modify: `apps/inventor-studio/src/pages/Signup.tsx`
- Modify: `apps/inventor-studio/src/pages/SetupLogin.tsx`
- Modify: `apps/inventor-studio/src/pages/PendingApproval.tsx`
- Modify: `apps/inventor-studio/src/pages/Welcome.tsx`
- Modify: `apps/inventor-studio/src/pages/GuestStream.tsx`
- Modify: `apps/inventor-studio/src/pages/Upgrade.tsx`
- Modify: `apps/inventor-studio/src/components/ShareSheet.tsx`
- Modify: `apps/inventor-studio/src/components/PatternLock.tsx`

**Goal:** Align inventor-studio styling with root standard. This is the largest app with the most pages.

- [ ] **Step 1: Read all files**

- [ ] **Step 2: Standardize core pages (Dashboard, Chat, Inventions, Vibe)**

Key changes:
- Cards: `p-4` instead of `p-3` (inventor-studio was too tight). `rounded-[10px]`
- Replace `border-white/5..20` with `border-border` or `border-primary/10..20`
- Replace `font-bold` with `font-semibold` where it's a label (not a heading)
- Chat: consistent message bubble and input styling
- Vibe: consistent mode selector and code block styling

- [ ] **Step 3: Standardize DreamStream and GuestStream**

These are complex pages. Key changes:
- Console strip: consistent card styling
- Agent panels: consistent collapsible section styling
- Progress indicators: token-based colors
- Export buttons: consistent sizing
- Keep the live-stream feel — these pages can be slightly more dramatic

- [ ] **Step 4: Standardize InventionDetail and ShowcaseView**

Key changes:
- Remove hardcoded `#f8fafc` backgrounds → `bg-background`
- Consistent section cards
- Consistent pros/cons list styling (already fixed icons in Task 7)
- ShareSheet: consistent with businesses version

- [ ] **Step 5: Standardize Electronics, CircuitCanvas, CircuitPublic**

Key changes:
- Remove all inline `style={}` for colors → use Tailwind classes
- Consistent card and button styling
- Loading spinners already fixed in Task 8

- [ ] **Step 6: Standardize auth pages (Login, Signup, SetupLogin, PendingApproval, AdminDashboard)**

Key changes:
- Login: consistent form card and input styling
- Signup: match root Signup pattern
- SetupLogin: consistent step cards and button sizing
- PendingApproval: consistent message card
- AdminDashboard: consistent table and stats cards

- [ ] **Step 7: Standardize Welcome (landing page)**

Key changes:
- Keep the dramatic hero styling — this page should feel special
- Standardize pricing cards, feature cards, CTA buttons
- Consistent nav bar styling
- Replace hamburger menu icon (already done in Task 7)

- [ ] **Step 8: Verify all inventor-studio pages at `/inventor-studio/*`**

Navigate through every page in both themes. Check for:
- No hardcoded colors remaining
- No `border-white/*` remaining
- Consistent card/button/input patterns
- DreamStream live stream still looks dramatic

- [ ] **Step 9: Commit**

```bash
git add apps/inventor-studio/src/pages/ apps/inventor-studio/src/components/ShareSheet.tsx apps/inventor-studio/src/components/PatternLock.tsx
git commit -m "style: standardize cards, buttons, inputs across all inventor-studio pages"
```

---

## Task 13: Polish Genesis App Pages

**Files:**
- Modify: `apps/genesis/src/pages/Canvas.tsx`
- Modify: `apps/genesis/src/pages/ProjectPicker.tsx`
- Modify: `apps/genesis/src/pages/AgentDetail.tsx`
- Modify: `apps/genesis/src/pages/Approvals.tsx`
- Modify: `apps/genesis/src/pages/AuditTrail.tsx`
- Modify: `apps/genesis/src/pages/Runtime.tsx`
- Modify: `apps/genesis/src/pages/Settings.tsx`
- Modify: `apps/genesis/src/components/ConfigPanel.tsx`
- Modify: `apps/genesis/src/components/Sidebar.tsx`
- Modify: `apps/genesis/src/components/TemplateGallery.tsx`

**Goal:** Align genesis styling with root standard.

- [ ] **Step 1: Read all 10 files**

- [ ] **Step 2: Standardize all pages**

Genesis already uses `btn-primary` CSS class and is fairly consistent. Key changes:
- Replace old `btn-primary` CSS usage with new standardized version (already updated CSS in Task 1)
- Cards: `rounded-[10px]`, `p-4`
- ConfigPanel: consistent input and select styling
- Sidebar: consistent section headers and drag handle styling
- TemplateGallery: consistent gallery card styling
- Settings page: consistent form layout
- Canvas: keep ReactFlow-specific styling, just align surrounding UI
- Runtime/AgentDetail: consistent stat cards and log styling
- Use `Loader2` only (not `Loader`) — already handled in Task 8

- [ ] **Step 3: Verify all genesis pages at `/genesis/*`**

- [ ] **Step 4: Commit**

```bash
git add apps/genesis/src/pages/ apps/genesis/src/components/ConfigPanel.tsx apps/genesis/src/components/Sidebar.tsx apps/genesis/src/components/TemplateGallery.tsx
git commit -m "style: standardize cards, buttons, inputs across all genesis pages"
```

---

## Task 14: Final Cross-App Verification & Cleanup

**Files:**
- Potentially any file from Tasks 1-13

**Goal:** End-to-end verification that all 4 apps look identical in style.

- [ ] **Step 1: Build all apps**

```bash
npm run build:all
```

Fix any TypeScript or build errors.

- [ ] **Step 2: Start production server and verify**

```bash
node server.js
```

Open each app in the browser and navigate every page:
- `http://localhost:3003/` — root app (all pages including layers)
- `http://localhost:3003/businesses` — businesses app
- `http://localhost:3003/inventor-studio` — inventor studio
- `http://localhost:3003/genesis` — genesis chamber

Check in both light and dark mode.

- [ ] **Step 3: Screenshot comparison checklist**

Verify on each app:
- [ ] Header height is identical (h-9 / 36px)
- [ ] Nav icons are all Lucide (no emojis anywhere)
- [ ] Active nav state is consistent (primary text + primary/10 bg)
- [ ] Status dots use the standardized CSS class
- [ ] Cards all use `rounded-[10px]`, `p-4`, `border-border`
- [ ] Buttons have consistent padding and radius
- [ ] Inputs have consistent border, focus ring, and height
- [ ] Spinners all use `Loader2` or `loader-spinner` CSS class
- [ ] No hardcoded colors (search for `#f8fafc`, `#3b82f6` in inline styles)
- [ ] No `border-white/` usage remaining
- [ ] Minimum font size is `text-[0.6rem]` (no `text-[10px]` or smaller)
- [ ] Light mode works correctly on every page

- [ ] **Step 4: Fix any issues found**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "style: final cross-app UI polish verification and fixes"
```

- [ ] **Step 6: Clean up the style options HTML file**

```bash
git rm docs/ui-style-options.html
git commit -m "chore: remove temporary style comparison page"
```
