# Genesis Chamber — Design Spec

**Date:** 2026-05-21
**Status:** Approved
**Location:** Sub-app at `apps/genesis/` served at `/genesis`, 6 layer pages in root app

## Overview

Genesis Chamber is a visual AI agent creator for Artificial Brain v3. Users build agents on a drag-and-drop canvas (ReactFlow), connect them to tools and each other via wiring, and deploy them as running processes. Every agent automatically gets 6 infrastructure layers: Orchestrator, Memory Management, Tools Manager, Identity Manager, Observability, and Guardrails + Governance.

## Architecture

- **Sub-app** at `apps/genesis/` with own `package.json`, `vite.config.ts`, built to `public/genesis/`
- **Served** by the existing `server.js` at `/genesis/*` (same pattern as inventor-studio, businesses)
- **Backend routes** at `routes/genesis.js`, mounted as `/genesis/api/*` in server.js
- **Models** in `models/Genesis*.js` using existing MongoDB connection
- **6 layer config pages** in root app at `src/pages/layers/*.tsx`
- **Desktop icons** on Home.tsx: Genesis Chamber + 6 layer icons in a tray
- **LLM** uses existing 4-tier stack from `services/llm.js`

## Canvas

### Node Types

| Node | Color | Purpose |
|------|-------|---------|
| Agent | `#3b82f6` (blue) | AI agent with LLM brain. Config: name, system prompt, model, temperature, max tokens. Advanced: role selection, custom model URL |
| Tool | `#14b8a6` (teal) | Tool from the 38 built-in local agent tools + custom tools. Wired to agents to grant access |
| Bus | `#f59e0b` (amber) | Message bus for pub/sub event fan-out. Config: name, topic list |

### Edge Types

| Edge | Style | Purpose |
|------|-------|---------|
| Direct | Blue solid + arrow | Agent-to-agent data flow |
| Conditional | Red dashed + arrow | Agent-to-agent with condition (e.g., "if refund > $50") |
| Bus Publish | Amber line | Agent publishes to Bus |
| Bus Subscribe | Green line | Bus delivers to subscribing Agent |

### Agent Config Modes

- **Simple (default):** Name, system prompt, model picker, temperature, max tokens
- **Role-based:** Adds role selection (reasoning, language, coder) mapping to existing LLM roles
- **Custom:** Adds custom OpenAI-compatible endpoint URL

### Canvas Interactions

- Drag nodes from left sidebar onto canvas
- Click node to open config panel on right
- Drag from node handle to create wire
- Right-click node for delete, duplicate, disconnect
- Scroll to zoom, drag to pan
- Minimap in bottom-right corner
- Auto-save on every change with version history

### Sidebar Layout

- Search bar
- Agents section: "+ New Agent" button, "From Template" button
- Tools section: 38 tools grouped by category (File, Network, Git, Scripts, System, Web, Desktop, Archive, Search, Meta), expandable
- Bus section: "+ New Bus" button

### Templates

Blank canvas by default. "Templates" button opens a gallery with pre-built agents (Customer Service Bot, Data Analyst, Code Reviewer, Email Summarizer, etc.). User drags a template in, it arrives pre-configured and customizable.

## Agent Communication

Two connection patterns, user picks per case:

1. **Direct wires** for simple linear pipelines (A triggers B triggers C)
2. **Message Bus** for event fan-out (one event, many listeners)

Both can coexist on the same canvas.

## Agent Runtime

### Trigger Types

- Manual (user clicks Run)
- API/Webhook (POST `/genesis/api/agents/:id/run`)
- Schedule (cron expression)
- Event-driven (one agent finishing triggers the next)

### Runtime Modes

- **Always-on:** Long-lived background process, listens for triggers continuously
- **On-demand:** Executes task, returns result, stops
- User chooses per agent

### Deployment

- User builds workflow on canvas, clicks Deploy
- Canvas nodes show live status (green = running, red = error, yellow = waiting approval)
- Separate Runtime dashboard for deep monitoring (logs, traces, metrics)

## 6 Automatic Layers

All layers auto-apply with defaults. Each has its own config page in the root app, accessible via desktop tray icons and nav dropdown.

### Layer 1: Orchestrator (`/layer-orchestrator`)

- Priority table: agents with priority 1-10, drag to reorder
- Mode: Manual (user sets) / Automatic (orchestrator decides)
- Resource limits: max concurrent LLM calls, max tokens/min per agent
- Live queue view: which agents waiting, who's executing
- Priority rules: "if type=live-chat, priority=10"

### Layer 2: Memory (`/layer-memory`)

- Per-agent memory assignment: toggles for short-term, long-term, episodic
- Memory quota: max memories per agent (default 100 short, 50 long)
- Consolidation settings: importance threshold, age before promotion, prune interval
- Mode: Manual / Automatic

### Layer 3: Tools (`/layer-tools`)

- Sandbox toggle: global on/off
- Per-agent tool permissions: matrix (agents x tool categories)
- Rate limits: max tool calls per minute per agent
- Blocked tools: globally block specific tools

### Layer 4: Identity (`/layer-identity`)

- Agent credentials: short-lived JWT per agent, show expiry, regenerate
- Permission scopes: read-only, read-write, admin per agent
- Acting-on-behalf-of: maps agent to user email for audit trail
- Token TTL: configurable (default 1 hour)
- Audit log: who used what token to call which tool

### Layer 5: Observability (`/layer-observability`)

- Live log stream: real-time feed of all agent decisions, tool calls, responses
- Agent timeline: click agent, see full execution trace
- Search/filter: by agent, time range, event type
- Decision replay: click any decision point, see full context (input, LLM response, action taken)
- Export: download logs as JSON/CSV

### Layer 6: Guardrails + Governance (`/layer-guardrails`)

- Input guardrails: toggle on/off, sensitivity (low/medium/high), checks for prompt injection/jailbreak
- Output guardrails: toggle on/off, checks for inappropriate content, PII, incorrect format
- Governance rules: table of "action + threshold + requires human_approval"
- Auto-approve toggle: skip human-in-the-loop (with warning)
- Approval queue: pending approvals with approve/deny, full context
- Notification: in-app always on, optional email, optional webhook URL

## Agent Persistence

- Auto-save continuously (every canvas change)
- Version history: last N snapshots, user can revert
- Multiple projects: user creates named projects, project picker at `/genesis/`

## Data Models

### GenesisProject

```
{
  _id, userId, name, description,
  nodes: [{ id, type, position: {x,y}, data: {} }],
  edges: [{ id, source, target, type, data: {label, condition} }],
  versions: [{ savedAt, nodes, edges }],
  status: 'draft' | 'deployed' | 'stopped',
  createdAt, updatedAt
}
```

### GenesisAgent

```
{
  _id, projectId, nodeId, name, systemPrompt,
  llmConfig: { mode, role, customUrl, model, temperature, maxTokens },
  runtime: { type, schedule, triggers: [] },
  layers: {
    priority,
    memoryType: [], memoryQuota: { short, long },
    toolPermissions: [],
    identity: { actingAs, scopes: [], tokenTTL },
    guardrails: { inputCheck, outputCheck, sensitivity, autoApprove, governanceRules: [] }
  },
  status: 'idle' | 'running' | 'error' | 'waiting_approval',
  createdAt, updatedAt
}
```

### GenesisRun

```
{
  _id, agentId, projectId, trigger,
  input, output,
  steps: [{ ts, type, data, tokenUsage }],
  status: 'running' | 'completed' | 'failed' | 'blocked',
  startedAt, completedAt
}
```

### GenesisApproval

```
{
  _id, agentId, runId, action, context, threshold,
  status: 'pending' | 'approved' | 'denied',
  notifiedVia: [], decidedBy, decidedAt, createdAt
}
```

## API Routes

```
POST   /genesis/api/projects              Create project
GET    /genesis/api/projects              List projects
GET    /genesis/api/projects/:id          Get project
PUT    /genesis/api/projects/:id          Save project (auto-save)
GET    /genesis/api/projects/:id/versions Version history
POST   /genesis/api/projects/:id/deploy   Deploy agents
POST   /genesis/api/projects/:id/stop     Stop agents
GET    /genesis/api/runtime               All running agents
GET    /genesis/api/runtime/:agentId/logs Agent logs
POST   /genesis/api/agents/:id/run        Trigger on-demand agent
POST   /genesis/api/agents/:id/approve    Human approval
```

## Navigation

### Desktop (Home.tsx)

- Genesis Chamber icon → `/genesis`
- Layer tray (6 grouped icons): Orchestrator, Memory, Tools, Identity, Observability, Guardrails

### Root app AppHeader

- "Layers" dropdown in nav containing all 6 layer links

### Genesis sub-app AppHeader

- Projects, Runtime nav links + Home + Logout buttons

## Tech Stack

- **Canvas:** ReactFlow (`@xyflow/react`)
- **Frontend:** React + Tailwind + Lucide (same as all other apps)
- **Backend:** Express routes in `routes/genesis.js`
- **Database:** MongoDB (same connection as inventor-studio)
- **LLM:** Existing 4-tier stack from `services/llm.js`
- **Build:** Vite, output to `public/genesis/`
- **Theme:** Light theme matching inventor-studio/businesses
