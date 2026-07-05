import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  type Connection, type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { api } from '@/lib/api'
import { Sidebar } from '@/components/Sidebar'
import { ConfigPanel } from '@/components/ConfigPanel'
import { AgentNode } from '@/components/nodes/AgentNode'
import { ToolNode } from '@/components/nodes/ToolNode'
import { BusNode } from '@/components/nodes/BusNode'
import { DirectEdge } from '@/components/edges/DirectEdge'
import { ConditionalEdge } from '@/components/edges/ConditionalEdge'
import { BusEdge } from '@/components/edges/BusEdge'
import { ArrowLeft, Play, Square, Loader, Send, Brain } from 'lucide-react'
import { TemplateGallery, type Template } from '@/components/TemplateGallery'

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
  const [showTemplates, setShowTemplates] = useState(false)
  const [projectStatus, setProjectStatus] = useState<string>('draft')
  const [deploying, setDeploying] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [agents, setAgents] = useState<any[]>([])
  const [runningAgent, setRunningAgent] = useState<string | null>(null)
  const [runInput, setRunInput] = useState('')
  const [showRunPanel, setShowRunPanel] = useState(false)
  const [runTarget, setRunTarget] = useState<any>(null)
  const [lastRunOutput, setLastRunOutput] = useState<string | null>(null)

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
        setProjectStatus(p.status || 'draft')
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
        const maxId = (p.nodes || []).reduce((max: number, n: any) => {
          const num = parseInt(n.id.replace(/\D/g, ''), 10)
          return isNaN(num) ? max : Math.max(max, num)
        }, 0)
        nodeIdCounter = maxId + 1
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [projectId, navigate, setNodes, setEdges])

  // Auto-save debounced 2s
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

  useEffect(() => { triggerAutoSave() }, [nodes, edges, triggerAutoSave])

  // Connect nodes
  const onConnect = useCallback((connection: Connection) => {
    const sourceNode = nodesRef.current.find(n => n.id === connection.source)
    const targetNode = nodesRef.current.find(n => n.id === connection.target)

    let edgeType = 'direct'
    const edgeData: Record<string, unknown> = {}

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

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const handleNodeUpdate = useCallback((id: string, newData: any) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: newData } : n))
    setSelectedNode(prev => prev?.id === id ? { ...prev, data: newData } : prev)
  }, [setNodes])

  const handleNodeDelete = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id))
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id))
    setSelectedNode(null)
  }, [setNodes, setEdges])

  const handleTemplateSelect = useCallback((template: Template) => {
    // Add agent node
    const agentId = `agent-${nodeIdCounter++}`
    const agentNode: Node = {
      id: agentId,
      type: 'agent',
      position: { x: 200 + Math.random() * 100, y: 100 + Math.random() * 100 },
      data: {
        name: template.name,
        systemPrompt: template.systemPrompt,
        llmConfig: template.llmConfig,
        runtime: template.runtime,
      },
    }

    // Add suggested tool nodes + edges
    const toolNodes: Node[] = template.suggestedTools.map((toolName, i) => {
      const toolId = `tool-${nodeIdCounter++}`
      return {
        id: toolId,
        type: 'tool',
        position: { x: 520, y: 60 + i * 100 },
        data: { toolName, description: '', category: 'Tool' },
      }
    })

    const toolEdges = toolNodes.map(tn => ({
      id: `e-${Date.now()}-${tn.id}`,
      source: agentId,
      target: tn.id,
      type: 'direct',
      data: {},
    }))

    setNodes(nds => [...nds, agentNode, ...toolNodes])
    setEdges(eds => [...eds, ...toolEdges])
    setShowTemplates(false)
  }, [setNodes, setEdges])

  // Deploy project — creates agent docs from canvas nodes
  const handleDeploy = useCallback(async () => {
    if (!projectId) return
    setDeploying(true)
    try {
      const { data } = await api.post(`/projects/${projectId}/deploy`)
      if (data.ok) {
        setProjectStatus('deployed')
        setAgents(data.agents || [])
      }
    } catch {} finally { setDeploying(false) }
  }, [projectId])

  // Stop project
  const handleStop = useCallback(async () => {
    if (!projectId) return
    setStopping(true)
    try {
      const { data } = await api.post(`/projects/${projectId}/stop`)
      if (data.ok) {
        setProjectStatus('stopped')
        setAgents(prev => prev.map(a => ({ ...a, status: 'stopped' })))
      }
    } catch {} finally { setStopping(false) }
  }, [projectId])

  // Run a single agent
  const handleRunAgent = useCallback(async () => {
    if (!runTarget || !runInput.trim()) return
    setRunningAgent(runTarget.id)
    setLastRunOutput(null)
    try {
      const { data } = await api.post(`/agents/${runTarget.id}/run`, { input: runInput.trim(), trigger: 'manual' })
      if (data.ok) {
        setLastRunOutput(data.run?.output || 'No output')
        // Update agent status
        setAgents(prev => prev.map(a => a.id === runTarget.id ? { ...a, status: data.run?.status === 'completed' ? 'idle' : data.run?.status } : a))
      }
    } catch (e: any) {
      setLastRunOutput(`Error: ${e?.response?.data?.error || e.message}`)
    } finally { setRunningAgent(null) }
  }, [runTarget, runInput])

  // Load agents on deploy status
  useEffect(() => {
    if (!projectId || projectStatus !== 'deployed') return
    api.get(`/projects/${projectId}/agents`).then(({ data }) => {
      if (data.ok) setAgents(data.agents || [])
    }).catch(() => {})
  }, [projectId, projectStatus])

  // Inject agent status into canvas nodes
  useEffect(() => {
    if (agents.length === 0) return
    const statusMap: Record<string, string> = {}
    for (const a of agents) statusMap[a.nodeId] = a.status
    setNodes(nds => {
      const edgeList = edgesRef.current || []
      return nds.map(n => {
        if (n.type !== 'agent') return n
        const status = statusMap[n.id]
        const agentDoc = agents.find(a => a.nodeId === n.id)
        // Gather knowledge paths from connected tool nodes that have config.path set
        const connectedToolIds = edgeList
          .filter((e: any) => e.source === n.id || e.target === n.id)
          .map((e: any) => e.source === n.id ? e.target : e.source)
        const knowledgePaths = nds
          .filter(t => t.type === 'tool' && connectedToolIds.includes(t.id) && t.data?.config?.path)
          .map(t => t.data.config.path)
        return {
          ...n,
          data: {
            ...n.data,
            _agentStatus: status || n.data._agentStatus,
            _agentId: agentDoc?.id || n.data._agentId,
            _knowledgePaths: knowledgePaths,
          },
        }
      })
    })
  }, [agents, setNodes])

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

        {/* Deploy / Stop */}
        {projectStatus !== 'deployed' ? (
          <button onClick={handleDeploy} disabled={deploying || nodes.filter(n => n.type === 'agent').length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-30">
            {deploying ? <Loader className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Deploy
          </button>
        ) : (
          <button onClick={handleStop} disabled={stopping}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-30">
            {stopping ? <Loader className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
            Stop
          </button>
        )}

        <span className={`text-[10px] uppercase tracking-[0.16em] font-semibold px-2 py-0.5 rounded-full border ${
          projectStatus === 'deployed' ? 'bg-green-500/10 text-green-600 border-green-500/20'
          : projectStatus === 'stopped' ? 'bg-red-500/10 text-red-600 border-red-500/20'
          : 'bg-primary/10 text-primary border-primary/20'
        }`}>
          {projectStatus}
        </span>

        <a href="/" className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground text-xs">
          Desktop
        </a>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenTemplates={() => setShowTemplates(true)} />

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
            onDelete={handleNodeDelete}
            onRun={(agentId, name) => {
              setRunTarget({ id: agentId, name })
              setShowRunPanel(true)
              setRunInput('')
              setLastRunOutput(null)
            }}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Run Agent Panel — bottom panel when deployed */}
      {showRunPanel && runTarget && (
        <div className="absolute bottom-0 left-[240px] right-0 z-20 bg-card border-t border-border p-4 animate-slideUp">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">Run: {runTarget.name}</span>
              <button onClick={() => { setShowRunPanel(false); setLastRunOutput(null) }}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="flex gap-2">
              <input
                value={runInput}
                onChange={e => setRunInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRunAgent()}
                placeholder="Enter input for this agent..."
                className="input-field flex-1 text-sm"
              />
              <button onClick={handleRunAgent} disabled={!!runningAgent || !runInput.trim()}
                className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5">
                {runningAgent ? <Loader className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Run
              </button>
            </div>
            {lastRunOutput && (
              <div className="mt-3 rounded-xl bg-muted border border-border p-4 max-h-[200px] overflow-y-auto">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Output</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{lastRunOutput}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showTemplates && (
        <TemplateGallery
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  )
}
