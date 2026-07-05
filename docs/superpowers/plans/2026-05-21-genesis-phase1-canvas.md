# Genesis Chamber Phase 1 — Canvas & Sub-App Scaffold

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Genesis Chamber sub-app with a working ReactFlow canvas where users can drag Agent, Tool, and Bus nodes from a sidebar, wire them together with Direct/Conditional/Bus edges, click nodes to configure them, and save/load projects via API.

**Architecture:** Genesis is a Vite+React sub-app at `apps/genesis/` built to `public/genesis/`, served by the existing `server.js`. The canvas uses `@xyflow/react` for drag-drop node editing. Backend routes at `routes/genesis.js` handle project CRUD with MongoDB models. Desktop icons in the root app link to `/genesis`.

**Tech Stack:** React 18, ReactFlow (`@xyflow/react`), Tailwind CSS, Vite, Express, Mongoose, Lucide icons

---

## File Structure

### New files — Sub-app (`apps/genesis/`)

```
apps/genesis/
├── package.json                          # dependencies: react, react-dom, react-router-dom, @xyflow/react, tailwindcss, lucide-react, axios
├── vite.config.ts                        # base: '/genesis/', proxy /genesis/api → localhost:8095
├── tsconfig.json                         # same as inventor-studio
├── tsconfig.node.json
├── postcss.config.js
├── tailwind.config.js                    # same theme tokens as inventor-studio
├── index.html                            # Google Fonts, mount point
├── src/
│   ├── main.tsx                          # ReactDOM.createRoot
│   ├── App.tsx                           # BrowserRouter basename="/genesis", routes
│   ├── index.css                         # Copy of inventor-studio light theme
│   ├── lib/
│   │   ├── api.ts                        # Axios instance baseURL="/genesis/api", token helpers
│   │   └── utils.ts                      # cn() helper
│   ├── context/
│   │   └── AuthContext.tsx               # Auth provider (same pattern as inventor-studio)
│   ├── components/
│   │   ├── AppHeader.tsx                 # Genesis nav: Projects, Runtime, Home, Logout
│   │   ├── Sidebar.tsx                   # Left panel: Agents, Tools (38 grouped), Bus drag palette
│   │   ├── ConfigPanel.tsx               # Right panel: opens when node clicked, renders config form
│   │   ├── nodes/
│   │   │   ├── AgentNode.tsx             # Blue agent node for ReactFlow
│   │   │   ├── ToolNode.tsx              # Teal tool node for ReactFlow
│   │   │   └── BusNode.tsx               # Amber bus node for ReactFlow
│   │   └── edges/
│   │       ├── DirectEdge.tsx            # Blue solid edge
│   │       ├── ConditionalEdge.tsx       # Red dashed edge
│   │       └── BusEdge.tsx               # Amber (publish) / Green (subscribe) edge
│   └── pages/
│       ├── ProjectPicker.tsx             # List/create/delete projects
│       └── Canvas.tsx                    # Main ReactFlow canvas page
```

### New files — Backend

```
models/GenesisProject.js                  # Mongoose schema for projects
routes/genesis.js                         # Express router for /genesis/api/*
```

### Modified files

```
server.js                                 # Mount genesis routes + static serving
src/pages/Home.tsx                        # Add Genesis desktop icon + layer tray
src/components/AppHeader.tsx              # Add Layers dropdown
src/App.tsx                               # Add layer routes
```

---

### Task 1: Initialize Genesis sub-app scaffold

**Files:**
- Create: `apps/genesis/package.json`
- Create: `apps/genesis/vite.config.ts`
- Create: `apps/genesis/tsconfig.json`
- Create: `apps/genesis/tsconfig.node.json`
- Create: `apps/genesis/postcss.config.js`
- Create: `apps/genesis/tailwind.config.js`
- Create: `apps/genesis/index.html`
- Create: `apps/genesis/src/main.tsx`
- Create: `apps/genesis/src/App.tsx`
- Create: `apps/genesis/src/index.css`
- Create: `apps/genesis/src/lib/utils.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "genesis-chamber",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@xyflow/react": "^12.10.2",
    "axios": "^1.7.7",
    "lucide-react": "^0.460.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  base: '/genesis/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/genesis/api': {
        target: 'http://localhost:8095',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
        destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
        popover: { DEFAULT: 'var(--popover)', foreground: 'var(--popover-foreground)' },
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
      },
      fontFamily: {
        kanit: ['Kanit', 'system-ui', 'sans-serif'],
        poppins: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 7: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Genesis Chamber — Artificial Brain</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create src/main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 9: Create src/App.tsx**

```tsx
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import ProjectPicker from '@/pages/ProjectPicker'
import Canvas from '@/pages/Canvas'

export default function App() {
  return (
    <BrowserRouter basename="/genesis">
      <Routes>
        <Route path="/" element={<ProjectPicker />} />
        <Route path="/canvas/:projectId" element={<Canvas />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 10: Copy index.css from inventor-studio**

Copy `apps/inventor-studio/src/index.css` to `apps/genesis/src/index.css`. This is the light theme with all utility classes (glass-card, btn-primary, chip, spinner, etc.)

- [ ] **Step 11: Create src/lib/utils.ts**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 12: Install dependencies**

Run: `cd apps/genesis && npm install`

- [ ] **Step 13: Commit**

```bash
git add apps/genesis/
git commit -m "feat(genesis): scaffold sub-app with Vite, React, Tailwind, ReactFlow"
```

---

### Task 2: Create AppHeader component

**Files:**
- Create: `apps/genesis/src/components/AppHeader.tsx`

- [ ] **Step 1: Create AppHeader**

```tsx
import { Link, NavLink } from 'react-router-dom'
import { Home, LogOut } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Projects' },
]

export function AppHeader() {
  const handleLogout = () => {
    localStorage.removeItem('brain_token')
    window.location.href = '/'
  }

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 h-14 sm:h-16 flex items-center gap-2 sm:gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="h-7 w-7 rounded-md bg-gradient-to-br from-violet-400 to-blue-600 grid place-items-center text-white font-black text-sm">
            G
          </span>
          <span className="hidden xs:inline font-semibold tracking-tight text-foreground">Genesis Chamber</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1 min-w-0" />

        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
          Genesis
        </span>

        <a href="/" className="p-2 rounded-lg hover:bg-accent transition-colors" title="Back to Desktop">
          <Home className="w-4 h-4 text-muted-foreground" />
        </a>

        <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Sign Out">
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/genesis/src/components/AppHeader.tsx
git commit -m "feat(genesis): add AppHeader with nav, home, logout"
```

---

### Task 3: Create API client

**Files:**
- Create: `apps/genesis/src/lib/api.ts`

- [ ] **Step 1: Create api.ts**

```typescript
import axios from 'axios'

export const api = axios.create({ baseURL: '/genesis/api' })

export function getToken(): string | null {
  return localStorage.getItem('brain_token')
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('brain_token')
    }
    return Promise.reject(err)
  },
)
```

- [ ] **Step 2: Commit**

```bash
git add apps/genesis/src/lib/api.ts
git commit -m "feat(genesis): add API client with auth interceptors"
```

---

### Task 4: Create MongoDB model — GenesisProject

**Files:**
- Create: `models/GenesisProject.js`

- [ ] **Step 1: Create GenesisProject model**

```javascript
import mongoose from 'mongoose'

const nodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['agent', 'tool', 'bus'], required: true },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false })

const edgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  type: { type: String, enum: ['direct', 'conditional', 'bus_publish', 'bus_subscribe'], default: 'direct' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false })

const versionSchema = new mongoose.Schema({
  savedAt: { type: Date, default: Date.now },
  nodes: [nodeSchema],
  edges: [edgeSchema],
}, { _id: false })

const genesisProjectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    nodes: [nodeSchema],
    edges: [edgeSchema],
    versions: [versionSchema],
    status: { type: String, enum: ['draft', 'deployed', 'stopped'], default: 'draft' },
  },
  { timestamps: true },
)

genesisProjectSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

export const GenesisProject = mongoose.model('GenesisProject', genesisProjectSchema)
```

- [ ] **Step 2: Commit**

```bash
git add models/GenesisProject.js
git commit -m "feat(genesis): add GenesisProject mongoose model"
```

---

### Task 5: Create backend routes — Project CRUD

**Files:**
- Create: `routes/genesis.js`

- [ ] **Step 1: Create routes/genesis.js**

```javascript
import { Router } from 'express'
import { GenesisProject } from '../models/GenesisProject.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const MAX_VERSIONS = 20

// List projects
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const projects = await GenesisProject.find({ userId: req.user._id })
      .select('name description status nodes edges createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean()
    // Add node/edge counts without sending full arrays
    const list = projects.map(p => ({
      id: String(p._id),
      name: p.name,
      description: p.description,
      status: p.status,
      nodeCount: (p.nodes || []).length,
      edgeCount: (p.edges || []).length,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
    res.json({ ok: true, projects: list })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Create project
router.post('/projects', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name?.trim()) return res.status(400).json({ ok: false, error: 'name required' })
    const project = await GenesisProject.create({
      userId: req.user._id,
      name: name.trim(),
      description: (description || '').trim(),
      nodes: [],
      edges: [],
      versions: [],
    })
    res.json({ ok: true, project })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Get project
router.get('/projects/:id', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.user._id })
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })
    res.json({ ok: true, project })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Save project (auto-save)
router.put('/projects/:id', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.user._id })
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })

    const { name, description, nodes, edges } = req.body

    // Push current state as version before overwriting
    if (project.nodes.length > 0 || project.edges.length > 0) {
      project.versions.push({
        savedAt: new Date(),
        nodes: project.nodes,
        edges: project.edges,
      })
      // Keep only last N versions
      if (project.versions.length > MAX_VERSIONS) {
        project.versions = project.versions.slice(-MAX_VERSIONS)
      }
    }

    if (name !== undefined) project.name = name.trim()
    if (description !== undefined) project.description = description.trim()
    if (nodes !== undefined) project.nodes = nodes
    if (edges !== undefined) project.edges = edges

    await project.save()
    res.json({ ok: true, project })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Delete project
router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    const result = await GenesisProject.deleteOne({ _id: req.params.id, userId: req.user._id })
    if (result.deletedCount === 0) return res.status(404).json({ ok: false, error: 'not found' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Get version history
router.get('/projects/:id/versions', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.user._id })
      .select('versions')
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })
    const versions = (project.versions || []).map((v, i) => ({
      index: i,
      savedAt: v.savedAt,
      nodeCount: (v.nodes || []).length,
      edgeCount: (v.edges || []).length,
    }))
    res.json({ ok: true, versions })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Restore version
router.post('/projects/:id/versions/:index/restore', requireAuth, async (req, res) => {
  try {
    const project = await GenesisProject.findOne({ _id: req.params.id, userId: req.user._id })
    if (!project) return res.status(404).json({ ok: false, error: 'not found' })
    const idx = Number(req.params.index)
    const version = project.versions[idx]
    if (!version) return res.status(404).json({ ok: false, error: 'version not found' })

    // Save current as version first
    project.versions.push({ savedAt: new Date(), nodes: project.nodes, edges: project.edges })
    if (project.versions.length > MAX_VERSIONS) project.versions = project.versions.slice(-MAX_VERSIONS)

    project.nodes = version.nodes
    project.edges = version.edges
    await project.save()
    res.json({ ok: true, project })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add routes/genesis.js
git commit -m "feat(genesis): add project CRUD + version history routes"
```

---

### Task 6: Mount Genesis in server.js

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add imports at top of server.js** (near the other route imports)

Add after the inventor-studio route imports:

```javascript
import genesisRouter from './routes/genesis.js';
```

- [ ] **Step 2: Mount API routes** (after the inventor-studio API mount block)

Add after line `app.get('/inventor-studio/api/health', ...)`:

```javascript
// ── Genesis Chamber API ──
app.use('/genesis/api', genesisRouter);
app.get('/genesis/api/health', (_req, res) => res.json({ ok: true, app: 'genesis' }));
```

- [ ] **Step 3: Mount static serving** (after the inventor-studio static block)

Add after `app.use('/inventor-studio', express.static(...))`:

```javascript
app.use('/genesis', express.static(path.join(publicDir, 'genesis')));
```

- [ ] **Step 4: Add SPA fallback** (after the inventor-studio SPA fallback)

Add after the `app.get('/inventor-studio/*', ...)` block:

```javascript
app.get('/genesis/*', (req, res) => {
  if (req.path.startsWith('/genesis/api/')) return res.status(404).json({ error: 'not found' });
  const idx = path.join(publicDir, 'genesis', 'index.html');
  res.sendFile(idx, (err) => { if (err) res.status(404).send('Genesis not built — run: cd apps/genesis && npx vite build --outDir ../../public/genesis') });
});
```

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat(genesis): mount API routes + static serving in server.js"
```

---

### Task 7: Create custom ReactFlow nodes — AgentNode, ToolNode, BusNode

**Files:**
- Create: `apps/genesis/src/components/nodes/AgentNode.tsx`
- Create: `apps/genesis/src/components/nodes/ToolNode.tsx`
- Create: `apps/genesis/src/components/nodes/BusNode.tsx`

- [ ] **Step 1: Create AgentNode.tsx**

```tsx
import { Handle, Position } from '@xyflow/react'
import { Brain } from 'lucide-react'

export function AgentNode({ data, selected }: any) {
  return (
    <div className={`bg-card rounded-xl border-2 transition-all min-w-[200px] max-w-[240px] shadow-sm ${
      selected ? 'border-blue-500 shadow-blue-500/20 shadow-md' : 'border-blue-400/60'
    }`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white" />

      <div className="bg-blue-500/8 px-3 py-2 border-b border-blue-500/15 rounded-t-[10px] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-[10px] font-bold text-blue-700 font-kanit tracking-wide">AGENT</span>
        {data.runtime?.type === 'always-on' && (
          <span className="ml-auto text-[8px] font-semibold px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 border border-green-500/20">LIVE</span>
        )}
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <p className="text-sm font-bold text-foreground font-kanit truncate">{data.name || 'New Agent'}</p>
        </div>
        {data.systemPrompt && (
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{data.systemPrompt}</p>
        )}
        {data.llmConfig?.model && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{data.llmConfig.model}</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white" />
    </div>
  )
}
```

- [ ] **Step 2: Create ToolNode.tsx**

```tsx
import { Handle, Position } from '@xyflow/react'
import { Wrench } from 'lucide-react'

const CAT_COLORS: Record<string, string> = {
  File: '#3b82f6', Folder: '#8b5cf6', 'Move/Copy': '#06b6d4', Search: '#14b8a6',
  Archive: '#f59e0b', Git: '#f97316', Scripts: '#ef4444', System: '#16a34a',
  Network: '#2563eb', Desktop: '#7c3aed', Web: '#ec4899', Meta: '#6b7280',
}

export function ToolNode({ data, selected }: any) {
  const catColor = CAT_COLORS[data.category] || '#14b8a6'

  return (
    <div className={`bg-card rounded-xl border-2 transition-all min-w-[160px] max-w-[200px] shadow-sm ${
      selected ? 'border-teal-500 shadow-teal-500/20 shadow-md' : 'border-teal-400/60'
    }`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white" />

      <div className="px-3 py-1.5 border-b flex items-center gap-2 rounded-t-[10px]"
        style={{ background: `${catColor}08`, borderColor: `${catColor}15` }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: catColor }} />
        <span className="text-[10px] font-bold font-kanit tracking-wide" style={{ color: catColor }}>TOOL</span>
        <span className="ml-auto text-[8px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{data.category || 'Tool'}</span>
      </div>

      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Wrench className="w-3 h-3 text-teal-500 shrink-0" />
          <p className="text-xs font-bold text-foreground font-mono truncate">{data.toolName || 'tool'}</p>
        </div>
        {data.description && (
          <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-2">{data.description}</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white" />
    </div>
  )
}
```

- [ ] **Step 3: Create BusNode.tsx**

```tsx
import { Handle, Position } from '@xyflow/react'
import { Radio } from 'lucide-react'

export function BusNode({ data, selected }: any) {
  const topics: string[] = data.topics || []

  return (
    <div className={`bg-card rounded-xl border-2 transition-all min-w-[180px] max-w-[220px] shadow-sm ${
      selected ? 'border-amber-500 shadow-amber-500/20 shadow-md' : 'border-amber-400/60'
    }`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white" />

      <div className="bg-amber-500/8 px-3 py-2 border-b border-amber-500/15 rounded-t-[10px] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-[10px] font-bold text-amber-700 font-kanit tracking-wide">MESSAGE BUS</span>
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Radio className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-sm font-bold text-foreground font-kanit truncate">{data.name || 'Event Bus'}</p>
        </div>
        {topics.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {topics.map((t) => (
              <span key={t} className="text-[9px] font-semibold font-mono px-1.5 py-0.5 rounded bg-amber-500/8 text-amber-700 border border-amber-500/20">
                {t}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[9px] text-muted-foreground">No topics defined</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white" />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/genesis/src/components/nodes/
git commit -m "feat(genesis): add AgentNode, ToolNode, BusNode ReactFlow components"
```

---

### Task 8: Create custom ReactFlow edges

**Files:**
- Create: `apps/genesis/src/components/edges/DirectEdge.tsx`
- Create: `apps/genesis/src/components/edges/ConditionalEdge.tsx`
- Create: `apps/genesis/src/components/edges/BusEdge.tsx`

- [ ] **Step 1: Create DirectEdge.tsx**

```tsx
import { BaseEdge, getBezierPath } from '@xyflow/react'

export function DirectEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label }: any) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#3b82f6', strokeWidth: 2.5 }} />
      {label && (
        <foreignObject x={labelX - 40} y={labelY - 10} width={80} height={20} style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 5, color: '#2563eb', fontSize: 9, fontWeight: 700, textAlign: 'center', padding: '1px 6px', whiteSpace: 'nowrap', fontFamily: 'Kanit, sans-serif' }}>
            {label}
          </div>
        </foreignObject>
      )}
    </>
  )
}
```

- [ ] **Step 2: Create ConditionalEdge.tsx**

```tsx
import { BaseEdge, getBezierPath } from '@xyflow/react'

export function ConditionalEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label }: any) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '8,5' }} />
      {label && (
        <foreignObject x={labelX - 50} y={labelY - 10} width={100} height={20} style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 5, color: '#dc2626', fontSize: 9, fontWeight: 700, textAlign: 'center', padding: '1px 6px', whiteSpace: 'nowrap', fontFamily: 'Kanit, sans-serif' }}>
            {label}
          </div>
        </foreignObject>
      )}
    </>
  )
}
```

- [ ] **Step 3: Create BusEdge.tsx**

```tsx
import { BaseEdge, getBezierPath } from '@xyflow/react'

export function BusEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, data }: any) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  const isPublish = data?.direction === 'publish'
  const color = isPublish ? '#f59e0b' : '#22c55e'
  const labelText = label || (isPublish ? 'publish' : 'subscribe')

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: color, strokeWidth: 2 }} />
      <foreignObject x={labelX - 35} y={labelY - 10} width={70} height={20} style={{ overflow: 'visible', pointerEvents: 'none' }}>
        <div style={{ background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 5, color, fontSize: 9, fontWeight: 700, textAlign: 'center', padding: '1px 6px', whiteSpace: 'nowrap', fontFamily: 'Kanit, sans-serif' }}>
          {labelText}
        </div>
      </foreignObject>
    </>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/genesis/src/components/edges/
git commit -m "feat(genesis): add DirectEdge, ConditionalEdge, BusEdge components"
```

---

### Task 9: Create Sidebar — drag palette for agents, tools, bus

**Files:**
- Create: `apps/genesis/src/components/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar.tsx**

```tsx
import { useState } from 'react'
import { Search, Brain, Wrench, Radio, ChevronDown, ChevronRight, Plus, Layers } from 'lucide-react'

const TOOL_CATEGORIES: { label: string; tools: { name: string; desc: string }[] }[] = [
  { label: 'File', tools: [
    { name: 'read_file', desc: 'Read file contents' }, { name: 'read_file_lines', desc: 'Read line range' },
    { name: 'write_file', desc: 'Write/overwrite file' }, { name: 'create_file', desc: 'Create new file' },
    { name: 'append_file', desc: 'Append to file' }, { name: 'edit_file', desc: 'Find & replace' },
    { name: 'delete_file', desc: 'Delete a file' },
  ]},
  { label: 'Folder', tools: [
    { name: 'create_folder', desc: 'Create directory' }, { name: 'delete_folder', desc: 'Delete directory' },
    { name: 'read_folder', desc: 'List with depth' }, { name: 'list_directory', desc: 'List entries' },
  ]},
  { label: 'Move/Copy', tools: [
    { name: 'move_file', desc: 'Move/rename file' }, { name: 'move_folder', desc: 'Move/rename folder' },
    { name: 'copy_file', desc: 'Copy a file' },
  ]},
  { label: 'Search', tools: [{ name: 'search_code', desc: 'Regex search files' }] },
  { label: 'Archive', tools: [
    { name: 'zip_folder', desc: 'Compress to ZIP' }, { name: 'unzip_file', desc: 'Extract ZIP' },
  ]},
  { label: 'Git', tools: [
    { name: 'git_status', desc: 'Git status' }, { name: 'git_diff', desc: 'Git diff' },
    { name: 'git_commit', desc: 'Stage & commit' },
  ]},
  { label: 'Scripts', tools: [
    { name: 'run_command', desc: 'Shell command (10s)' }, { name: 'bash', desc: 'Shell with cwd (30s)' },
    { name: 'pip_install', desc: 'Install Python pkg' }, { name: 'run_python', desc: 'Execute Python' },
  ]},
  { label: 'System', tools: [
    { name: 'get_system_info', desc: 'OS/CPU/RAM info' }, { name: 'list_processes', desc: 'Running processes' },
    { name: 'kill_process', desc: 'Kill by PID/name' }, { name: 'get_env_var', desc: 'Read env var' },
  ]},
  { label: 'Network', tools: [
    { name: 'http_get', desc: 'HTTP GET' }, { name: 'http_post', desc: 'HTTP POST' },
    { name: 'download_file', desc: 'Download from URL' },
  ]},
  { label: 'Desktop', tools: [
    { name: 'take_screenshot', desc: 'Capture screen' }, { name: 'read_clipboard', desc: 'Read clipboard' },
    { name: 'write_clipboard', desc: 'Write clipboard' },
  ]},
  { label: 'Web', tools: [
    { name: 'search_web', desc: 'DuckDuckGo search' }, { name: 'scrape_web', desc: 'Extract text from URL' },
  ]},
  { label: 'Meta', tools: [
    { name: 'list', desc: 'List all tools' }, { name: 'undo', desc: 'Reverse last action' },
    { name: 'undo_history', desc: 'Show undo stack' },
  ]},
]

function onDragStart(event: React.DragEvent, nodeType: string, data: Record<string, unknown>) {
  event.dataTransfer.setData('application/reactflow-type', nodeType)
  event.dataTransfer.setData('application/reactflow-data', JSON.stringify(data))
  event.dataTransfer.effectAllowed = 'move'
}

export function Sidebar() {
  const [search, setSearch] = useState('')
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const toggleCat = (label: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  const lowerSearch = search.toLowerCase()

  return (
    <div className="w-[240px] border-r border-border bg-card flex flex-col overflow-hidden shrink-0">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full bg-muted border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Agents */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Agents</p>
          <div
            draggable
            onDragStart={e => onDragStart(e, 'agent', { name: 'New Agent', systemPrompt: '', llmConfig: { mode: 'simple', temperature: 0.7, maxTokens: 2048 } })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-grab hover:border-blue-400/40 transition-all mb-1.5"
          >
            <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/20 grid place-items-center">
              <Brain className="w-3 h-3 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">+ New Agent</p>
              <p className="text-[9px] text-muted-foreground">Drag to canvas</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-primary hover:bg-accent transition-colors w-full">
            <Layers className="w-3 h-3" /> From Template
          </button>
        </div>

        {/* Tools */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Tools ({TOOL_CATEGORIES.reduce((s, c) => s + c.tools.length, 0)})</p>
          {TOOL_CATEGORIES.map(cat => {
            const filtered = lowerSearch
              ? cat.tools.filter(t => t.name.includes(lowerSearch) || t.desc.toLowerCase().includes(lowerSearch) || cat.label.toLowerCase().includes(lowerSearch))
              : cat.tools
            if (filtered.length === 0) return null
            const isOpen = expandedCats.has(cat.label)

            return (
              <div key={cat.label} className="mb-1">
                <button onClick={() => toggleCat(cat.label)}
                  className="flex items-center gap-2 w-full px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <span className="font-semibold">{cat.label}</span>
                  <span className="ml-auto text-[9px] opacity-60">{filtered.length}</span>
                </button>
                {isOpen && (
                  <div className="ml-2 mt-1 space-y-1">
                    {filtered.map(tool => (
                      <div
                        key={tool.name}
                        draggable
                        onDragStart={e => onDragStart(e, 'tool', { toolName: tool.name, description: tool.desc, category: cat.label })}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border cursor-grab hover:border-teal-400/40 transition-all text-[10px]"
                      >
                        <Wrench className="w-3 h-3 text-teal-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-mono font-semibold text-foreground truncate">{tool.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bus */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Bus</p>
          <div
            draggable
            onDragStart={e => onDragStart(e, 'bus', { name: 'Event Bus', topics: [] })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-grab hover:border-amber-400/40 transition-all"
          >
            <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 grid place-items-center">
              <Radio className="w-3 h-3 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">+ New Bus</p>
              <p className="text-[9px] text-muted-foreground">Drag to canvas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/genesis/src/components/Sidebar.tsx
git commit -m "feat(genesis): add Sidebar with draggable agent/tool/bus palette"
```

---

### Task 10: Create ConfigPanel — right-side panel for node config

**Files:**
- Create: `apps/genesis/src/components/ConfigPanel.tsx`

- [ ] **Step 1: Create ConfigPanel.tsx**

```tsx
import { X, Brain, Wrench, Radio, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface Props {
  node: any
  onUpdate: (id: string, data: any) => void
  onClose: () => void
}

export function ConfigPanel({ node, onUpdate, onClose }: Props) {
  if (!node) return null

  const { type, data } = node
  const update = (patch: Record<string, unknown>) => onUpdate(node.id, { ...data, ...patch })

  return (
    <div className="w-[300px] border-l border-border bg-card flex flex-col overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === 'agent' && <Brain className="w-4 h-4 text-blue-500" />}
          {type === 'tool' && <Wrench className="w-4 h-4 text-teal-500" />}
          {type === 'bus' && <Radio className="w-4 h-4 text-amber-500" />}
          <span className="text-sm font-bold text-foreground font-kanit">
            {type === 'agent' ? 'Agent Config' : type === 'tool' ? 'Tool Config' : 'Bus Config'}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {type === 'agent' && <AgentConfig data={data} update={update} />}
        {type === 'tool' && <ToolConfig data={data} />}
        {type === 'bus' && <BusConfig data={data} update={update} />}
      </div>
    </div>
  )
}

function AgentConfig({ data, update }: { data: any; update: (p: any) => void }) {
  const mode = data.llmConfig?.mode || 'simple'

  return (
    <>
      <Field label="Agent Name">
        <input value={data.name || ''} onChange={e => update({ name: e.target.value })}
          className="input-field text-sm" placeholder="e.g. Customer Service Bot" />
      </Field>

      <Field label="System Prompt">
        <textarea value={data.systemPrompt || ''} onChange={e => update({ systemPrompt: e.target.value })}
          className="input-field text-sm resize-none min-h-[100px]" placeholder="You are a helpful customer service agent..." />
      </Field>

      <Field label="Config Mode">
        <div className="flex gap-1.5">
          {(['simple', 'role', 'custom'] as const).map(m => (
            <button key={m} onClick={() => update({ llmConfig: { ...data.llmConfig, mode: m } })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                mode === m ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'
              }`}>
              {m === 'simple' ? 'Simple' : m === 'role' ? 'Role' : 'Custom'}
            </button>
          ))}
        </div>
      </Field>

      {mode === 'role' && (
        <Field label="LLM Role">
          <select value={data.llmConfig?.role || 'language'}
            onChange={e => update({ llmConfig: { ...data.llmConfig, role: e.target.value } })}
            className="input-field text-sm">
            <option value="reasoning">Reasoning</option>
            <option value="language">Language</option>
            <option value="coder">Coder</option>
          </select>
        </Field>
      )}

      {mode === 'custom' && (
        <Field label="Custom Model URL">
          <input value={data.llmConfig?.customUrl || ''} onChange={e => update({ llmConfig: { ...data.llmConfig, customUrl: e.target.value } })}
            className="input-field text-sm font-mono" placeholder="https://api.example.com/v1" />
        </Field>
      )}

      <Field label={`Temperature: ${(data.llmConfig?.temperature ?? 0.7).toFixed(1)}`}>
        <input type="range" min="0" max="2" step="0.1" value={data.llmConfig?.temperature ?? 0.7}
          onChange={e => update({ llmConfig: { ...data.llmConfig, temperature: parseFloat(e.target.value) } })}
          className="w-full accent-primary" />
      </Field>

      <Field label="Max Tokens">
        <input type="number" value={data.llmConfig?.maxTokens ?? 2048}
          onChange={e => update({ llmConfig: { ...data.llmConfig, maxTokens: parseInt(e.target.value) || 2048 } })}
          className="input-field text-sm font-mono" />
      </Field>

      <Field label="Runtime">
        <div className="flex gap-1.5">
          {(['on-demand', 'always-on'] as const).map(t => (
            <button key={t} onClick={() => update({ runtime: { ...data.runtime, type: t } })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                (data.runtime?.type || 'on-demand') === t ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'
              }`}>
              {t === 'on-demand' ? 'On-Demand' : 'Always-On'}
            </button>
          ))}
        </div>
      </Field>
    </>
  )
}

function ToolConfig({ data }: { data: any }) {
  return (
    <>
      <Field label="Tool Name">
        <div className="input-field text-sm font-mono bg-muted">{data.toolName || 'unknown'}</div>
      </Field>
      <Field label="Category">
        <div className="chip chip-cyan text-xs">{data.category || 'Tool'}</div>
      </Field>
      <Field label="Description">
        <p className="text-sm text-muted-foreground">{data.description || 'No description'}</p>
      </Field>
    </>
  )
}

function BusConfig({ data, update }: { data: any; update: (p: any) => void }) {
  const [newTopic, setNewTopic] = useState('')
  const topics: string[] = data.topics || []

  const addTopic = () => {
    if (!newTopic.trim() || topics.includes(newTopic.trim())) return
    update({ topics: [...topics, newTopic.trim()] })
    setNewTopic('')
  }

  const removeTopic = (t: string) => {
    update({ topics: topics.filter(x => x !== t) })
  }

  return (
    <>
      <Field label="Bus Name">
        <input value={data.name || ''} onChange={e => update({ name: e.target.value })}
          className="input-field text-sm" placeholder="e.g. Event Bus" />
      </Field>

      <Field label="Topics">
        <div className="flex gap-1.5 mb-2">
          <input value={newTopic} onChange={e => setNewTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTopic()}
            className="input-field text-sm flex-1 font-mono" placeholder="topic_name" />
          <button onClick={addTopic} className="btn-primary text-xs px-2.5 py-1.5">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-1">
          {topics.map(t => (
            <div key={t} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20">
              <span className="text-xs font-mono text-amber-700">{t}</span>
              <button onClick={() => removeTopic(t)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </Field>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/genesis/src/components/ConfigPanel.tsx
git commit -m "feat(genesis): add ConfigPanel for agent/tool/bus node settings"
```

---

### Task 11: Create ProjectPicker page

**Files:**
- Create: `apps/genesis/src/pages/ProjectPicker.tsx`

- [ ] **Step 1: Create ProjectPicker.tsx**

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, FolderOpen, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { AppHeader } from '@/components/AppHeader'

export default function ProjectPicker() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = async () => {
    try {
      const { data } = await api.get('/projects')
      if (data.ok) setProjects(data.projects || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const { data } = await api.post('/projects', { name: newName.trim() })
      if (data.ok) navigate(`/canvas/${data.project.id}`)
    } catch {} finally { setCreating(false) }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    setDeleting(id)
    try {
      await api.delete(`/projects/${id}`)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch {} finally { setDeleting(null) }
  }

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="animate-fadeIn">
          <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-3">Genesis Chamber</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Your Projects
          </h1>
          <p className="mt-2 text-muted-foreground">
            Build AI agent workflows. Each project is its own canvas.
          </p>
        </div>

        {/* Create new */}
        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 flex flex-col sm:flex-row gap-3 animate-fadeIn">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="New project name..."
            className="input-field flex-1"
          />
          <button onClick={handleCreate} disabled={creating || !newName.trim()}
            className="btn-primary px-6 py-2.5 flex items-center gap-2 shrink-0">
            {creating ? <span className="spinner" /> : <Plus className="w-4 h-4" />}
            Create Project
          </button>
        </div>

        {/* Project list */}
        {loading ? (
          <div className="flex justify-center py-20"><span className="loader" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No projects yet</h2>
            <p className="text-sm text-muted-foreground">Create your first project to start building AI agents.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
            {projects.map(p => (
              <div key={p.id}
                onClick={() => navigate(`/canvas/${p.id}`)}
                className="rounded-2xl bg-card border border-border p-5 cursor-pointer hover:border-primary/40 transition-all">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="h-10 w-10 rounded-lg grid place-items-center bg-primary/10 border border-primary/20">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`chip text-[9px] ${
                      p.status === 'deployed' ? 'chip-green' : p.status === 'stopped' ? 'chip-red' : 'chip-gray'
                    }`}>{p.status}</span>
                  </div>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{p.description || 'No description'}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>{p.nodeCount} nodes</span>
                    <span>{p.edgeCount} wires</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(p.updatedAt)}</span>
                  </div>
                  <button onClick={e => handleDelete(e, p.id)} disabled={deleting === p.id}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    {deleting === p.id ? <span className="spinner" /> : <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/genesis/src/pages/ProjectPicker.tsx
git commit -m "feat(genesis): add ProjectPicker page with create/list/delete"
```

---

### Task 12: Create Canvas page — the main ReactFlow canvas

**Files:**
- Create: `apps/genesis/src/pages/Canvas.tsx`

- [ ] **Step 1: Create Canvas.tsx**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  type Connection, type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { api } from '@/lib/api'
import { AppHeader } from '@/components/AppHeader'
import { Sidebar } from '@/components/Sidebar'
import { ConfigPanel } from '@/components/ConfigPanel'
import { AgentNode } from '@/components/nodes/AgentNode'
import { ToolNode } from '@/components/nodes/ToolNode'
import { BusNode } from '@/components/nodes/BusNode'
import { DirectEdge } from '@/components/edges/DirectEdge'
import { ConditionalEdge } from '@/components/edges/ConditionalEdge'
import { BusEdge } from '@/components/edges/BusEdge'
import { Save, Undo2, ArrowLeft } from 'lucide-react'

const NODE_TYPES = { agent: AgentNode, tool: ToolNode, bus: BusNode }
const EDGE_TYPES = { direct: DirectEdge, conditional: ConditionalEdge, bus: BusEdge }

let nodeIdCounter = 0

export default function Canvas() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  // Load project
  useEffect(() => {
    if (!projectId) return
    api.get(`/projects/${projectId}`)
      .then(({ data }) => {
        if (!data.ok) { navigate('/'); return }
        const p = data.project
        setProjectName(p.name)
        // Restore canvas state with higher nodeIdCounter
        const restored = (p.nodes || []).map((n: any) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        }))
        setNodes(restored)
        setEdges((p.edges || []).map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type || 'direct',
          data: e.data || {},
          label: e.data?.label || '',
        })))
        // Set counter above existing IDs
        const maxId = (p.nodes || []).reduce((max: number, n: any) => {
          const num = parseInt(n.id.replace(/\D/g, ''), 10)
          return isNaN(num) ? max : Math.max(max, num)
        }, 0)
        nodeIdCounter = maxId + 1
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [projectId, navigate, setNodes, setEdges])

  // Auto-save (debounced 2s after last change)
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      if (!projectId) return
      setSaving(true)
      try {
        const saveNodes = nodesRef.current.map(n => ({
          id: n.id, type: n.type, position: n.position, data: n.data,
        }))
        const saveEdges = edgesRef.current.map(e => ({
          id: e.id, source: e.source, target: e.target, type: e.type, data: e.data,
        }))
        await api.put(`/projects/${projectId}`, { nodes: saveNodes, edges: saveEdges })
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      } catch {} finally { setSaving(false) }
    }, 2000)
  }, [projectId])

  // Trigger auto-save on changes
  useEffect(() => { triggerAutoSave() }, [nodes, edges, triggerAutoSave])

  // Connect nodes
  const onConnect = useCallback((connection: Connection) => {
    const sourceNode = nodesRef.current.find(n => n.id === connection.source)
    const targetNode = nodesRef.current.find(n => n.id === connection.target)

    let edgeType = 'direct'
    const edgeData: Record<string, unknown> = {}

    // Determine edge type based on node types
    if (sourceNode?.type === 'bus' || targetNode?.type === 'bus') {
      edgeType = 'bus'
      edgeData.direction = sourceNode?.type === 'bus' ? 'subscribe' : 'publish'
    }

    setEdges(eds => addEdge({
      ...connection,
      id: `e-${Date.now()}`,
      type: edgeType,
      data: edgeData,
    }, eds))
  }, [setEdges])

  // Drop handler
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/reactflow-type')
    const dataStr = event.dataTransfer.getData('application/reactflow-data')
    if (!type) return

    const reactFlowBounds = event.currentTarget.getBoundingClientRect()
    const position = {
      x: event.clientX - reactFlowBounds.left - 100,
      y: event.clientY - reactFlowBounds.top - 40,
    }

    const data = dataStr ? JSON.parse(dataStr) : {}
    const newNode: Node = {
      id: `${type}-${nodeIdCounter++}`,
      type,
      position,
      data,
    }

    setNodes(nds => [...nds, newNode])
  }, [setNodes])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Node click → open config
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  // Update node data from config panel
  const handleNodeUpdate = useCallback((id: string, newData: any) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: newData } : n))
    setSelectedNode(prev => prev?.id === id ? { ...prev, data: newData } : prev)
  }, [setNodes])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="loader" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="h-12 border-b border-border bg-card/95 backdrop-blur-sm flex items-center gap-3 px-4 shrink-0 z-10">
        <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-400 to-blue-600 grid place-items-center text-white font-black text-[9px]">G</div>
        <span className="text-sm font-semibold text-foreground truncate">{projectName}</span>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {saving && <><span className="spinner" style={{ width: 10, height: 10 }} /> Saving...</>}
          {!saving && lastSaved && <>Saved {lastSaved}</>}
        </div>

        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          Genesis
        </span>

        <a href="/" className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground text-xs">
          Desktop
        </a>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 relative" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            colorMode="light"
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: 'direct' }}
          >
            <Background color="#e2e8f0" gap={24} size={1} />
            <Controls style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)', borderRadius: '8px' }} />
            <MiniMap
              nodeStrokeWidth={3}
              style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border)', borderRadius: '10px' }}
            />
          </ReactFlow>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center">
                <p className="text-lg font-bold text-muted-foreground/40 mb-2">Drag agents and tools from the sidebar</p>
                <p className="text-sm text-muted-foreground/30">Then wire them together to build your workflow</p>
              </div>
            </div>
          )}
        </div>

        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/genesis/src/pages/Canvas.tsx
git commit -m "feat(genesis): add Canvas page with ReactFlow, drag-drop, auto-save, config panel"
```

---

### Task 13: Add Genesis desktop icon + layer tray to Home.tsx

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Add Genesis + layer icons to APPS array**

Add these entries to the `APPS` array in `src/pages/Home.tsx`:

```typescript
  { id: 'genesis', label: 'Genesis', icon: '\u{269B}', href: '/genesis', gradient: 'from-white to-white' },
  { id: 'layer-orch', label: 'Orchestrator', icon: '\u{1F3AF}', path: '/layer-orchestrator', gradient: 'from-white to-white' },
  { id: 'layer-mem', label: 'Memory Cfg', icon: '\u{1F4BE}', path: '/layer-memory', gradient: 'from-white to-white' },
  { id: 'layer-tools', label: 'Tools Cfg', icon: '\u{1F9F0}', path: '/layer-tools', gradient: 'from-white to-white' },
  { id: 'layer-id', label: 'Identity', icon: '\u{1F511}', path: '/layer-identity', gradient: 'from-white to-white' },
  { id: 'layer-obs', label: 'Observability', icon: '\u{1F4F9}', path: '/layer-observability', gradient: 'from-white to-white' },
  { id: 'layer-guard', label: 'Guardrails', icon: '\u{1F6E1}', path: '/layer-guardrails', gradient: 'from-white to-white' },
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat(genesis): add Genesis + 6 layer icons to desktop"
```

---

### Task 14: Add Layers dropdown to root AppHeader

**Files:**
- Modify: `src/components/AppHeader.tsx`

- [ ] **Step 1: Add Layers dropdown**

Add a `useState` for dropdown and a Layers button after the Memory Mgmt nav link. Add a dropdown panel that shows when clicked with links to all 6 layer pages:

```tsx
// Add to imports
import { useState } from 'react'

// Inside AppHeader, add state
const [layersOpen, setLayersOpen] = useState(false)

// In the nav section, after the existing nav links, add:
<div className="relative">
  <button
    onClick={() => setLayersOpen(o => !o)}
    className={`px-2 py-0.5 rounded text-[0.65rem] transition-colors ${
      layersOpen ? 'text-primary bg-primary/10 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
    }`}
  >
    <span className="mr-1">{'\u{1F9EC}'}</span>Layers
  </button>
  {layersOpen && (
    <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[160px]">
      {[
        { to: '/layer-orchestrator', label: 'Orchestrator' },
        { to: '/layer-memory', label: 'Memory' },
        { to: '/layer-tools', label: 'Tools' },
        { to: '/layer-identity', label: 'Identity' },
        { to: '/layer-observability', label: 'Observability' },
        { to: '/layer-guardrails', label: 'Guardrails' },
      ].map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setLayersOpen(false)}
          className={({ isActive }) =>
            `block px-3 py-1.5 text-[0.65rem] transition-colors border-b border-border last:border-0 ${
              isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "feat(genesis): add Layers dropdown to root AppHeader"
```

---

### Task 15: Create placeholder layer pages + routes in root app

**Files:**
- Create: `src/pages/layers/Orchestrator.tsx`
- Create: `src/pages/layers/LayerMemory.tsx`
- Create: `src/pages/layers/LayerTools.tsx`
- Create: `src/pages/layers/Identity.tsx`
- Create: `src/pages/layers/Observability.tsx`
- Create: `src/pages/layers/Guardrails.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create all 6 layer pages** (each follows same pattern — config page with defaults, to be fleshed out in Phase 4)

Create `src/pages/layers/Orchestrator.tsx`:

```tsx
import { Settings } from 'lucide-react'

export default function Orchestrator() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Layer 1</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Orchestrator</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Priority allocation, resource limits, and queue management for running agents.
        </p>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 flex items-start gap-3">
        <Settings className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Coming in Phase 4</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Priority table, manual/auto mode toggle, resource limits, live queue view, and priority rules will be configured here.
          </p>
        </div>
      </div>
    </div>
  )
}
```

Create `src/pages/layers/LayerMemory.tsx` (same structure, different text):

```tsx
import { Database } from 'lucide-react'

export default function LayerMemory() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Layer 2</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Memory Config</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Per-agent memory assignment: short-term, long-term, episodic. Quotas and consolidation settings.
        </p>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 flex items-start gap-3">
        <Database className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Coming in Phase 4</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Memory type toggles, quota sliders, consolidation settings, and manual/auto mode will be configured here.
          </p>
        </div>
      </div>
    </div>
  )
}
```

Create `src/pages/layers/LayerTools.tsx`:

```tsx
import { Wrench } from 'lucide-react'

export default function LayerTools() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Layer 3</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Tools Config</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Sandbox settings, per-agent tool permissions, rate limits, and blocked tools.
        </p>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 flex items-start gap-3">
        <Wrench className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Coming in Phase 4</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sandbox toggle, permission matrix, rate limits, and global tool blocks will be configured here.
          </p>
        </div>
      </div>
    </div>
  )
}
```

Create `src/pages/layers/Identity.tsx`:

```tsx
import { Key } from 'lucide-react'

export default function Identity() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Layer 4</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Identity Manager</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Agent credentials, permission scopes, acting-on-behalf-of mapping, and audit logs.
        </p>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 flex items-start gap-3">
        <Key className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Coming in Phase 4</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            JWT tokens, permission scopes, user mapping, token TTL, and audit trail will be configured here.
          </p>
        </div>
      </div>
    </div>
  )
}
```

Create `src/pages/layers/Observability.tsx`:

```tsx
import { Eye } from 'lucide-react'

export default function Observability() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Layer 5</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Observability</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Live log stream, agent timelines, decision replay, and log export.
        </p>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 flex items-start gap-3">
        <Eye className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Coming in Phase 4</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time log stream, execution timelines, decision replay, and JSON/CSV export will be available here.
          </p>
        </div>
      </div>
    </div>
  )
}
```

Create `src/pages/layers/Guardrails.tsx`:

```tsx
import { Shield } from 'lucide-react'

export default function Guardrails() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Layer 6</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Guardrails + Governance</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Input/output guardrails, governance rules, human-in-the-loop approvals, and auto-approve toggle.
        </p>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Coming in Phase 4</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Input/output checks, sensitivity settings, governance rules, approval queue, and notification config will be here.
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add routes to src/App.tsx**

Add imports:

```tsx
import Orchestrator from '@/pages/layers/Orchestrator'
import LayerMemory from '@/pages/layers/LayerMemory'
import LayerTools from '@/pages/layers/LayerTools'
import Identity from '@/pages/layers/Identity'
import Observability from '@/pages/layers/Observability'
import Guardrails from '@/pages/layers/Guardrails'
```

Add routes inside the `<Route element={<AppLayout />}>` block:

```tsx
<Route path="/layer-orchestrator" element={<Orchestrator />} />
<Route path="/layer-memory" element={<LayerMemory />} />
<Route path="/layer-tools" element={<LayerTools />} />
<Route path="/layer-identity" element={<Identity />} />
<Route path="/layer-observability" element={<Observability />} />
<Route path="/layer-guardrails" element={<Guardrails />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/layers/ src/App.tsx
git commit -m "feat(genesis): add 6 layer placeholder pages + routes"
```

---

### Task 16: Build and verify

- [ ] **Step 1: Build root app**

Run: `npm run build`
Expected: Build succeeds with no type errors

- [ ] **Step 2: Build Genesis sub-app**

Run: `cd apps/genesis && npm install && npx vite build --outDir ../../public/genesis`
Expected: Build succeeds, files output to `public/genesis/`

- [ ] **Step 3: Verify server serves Genesis**

Run: `npm start` (or restart server)
- Visit `http://localhost:8095` → should see Genesis icon + 6 layer icons on desktop
- Click Genesis icon → should open `/genesis` with ProjectPicker
- Create a project → should navigate to canvas
- Drag an Agent node from sidebar → should appear on canvas
- Drag a Tool node → wire to Agent → wire should connect
- Click a node → ConfigPanel should open on right
- Changes should auto-save (check "Saved" timestamp in top bar)
- Visit `/layer-orchestrator` → should see placeholder page
- Layers dropdown in AppHeader should work

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(genesis): Phase 1 complete — canvas sub-app with nodes, edges, sidebar, config, auto-save"
```
