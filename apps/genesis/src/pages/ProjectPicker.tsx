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

        <div className="mt-8 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 flex flex-col sm:flex-row gap-3 animate-fadeIn">
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

        {loading ? (
          <div className="flex justify-center py-20"><span className="loader" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 animate-fadeIn">
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
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
                className="rounded-xl bg-card border border-border p-4 cursor-pointer hover:border-primary/40 transition-all">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="h-10 w-10 rounded-lg grid place-items-center bg-primary/10 border border-primary/20">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <span className={`chip text-[9px] ${
                    p.status === 'deployed' ? 'chip-green' : p.status === 'stopped' ? 'chip-red' : 'chip-gray'
                  }`}>{p.status}</span>
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
