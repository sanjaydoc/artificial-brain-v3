import { useState, useEffect } from 'react'

interface UserRow {
  id: string
  email: string
  role: string
  tier: string
  status: string
  auth: string[]
  createdAt: string
  updatedAt: string
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('brain_token')}`,
  'Content-Type': 'application/json',
})

export default function Admin() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/auth/admin/users', { headers: authHeaders() })
      const d = await r.json()
      if (d.ok) setUsers(d.users || [])
      else setStatus(d.error || 'Failed to load')
    } catch (e) {
      setStatus(`Error: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const updateUser = async (id: string, patch: Record<string, string>) => {
    try {
      const r = await fetch(`/api/auth/admin/users/${id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(patch),
      })
      const d = await r.json()
      if (d.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, ...d.user } : u))
        setStatus('Updated')
        setTimeout(() => setStatus(''), 2000)
      }
    } catch {}
  }

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return
    try {
      const r = await fetch(`/api/auth/admin/users/${id}`, { method: 'DELETE', headers: authHeaders() })
      const d = await r.json()
      if (d.ok) {
        setUsers(prev => prev.filter(u => u.id !== id))
        setStatus('Deleted')
        setTimeout(() => setStatus(''), 2000)
      }
    } catch {}
  }

  const q = search.toLowerCase()
  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || u.tier.toLowerCase().includes(q)
  )

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'Admin').length,
    approved: users.filter(u => u.status === 'approved').length,
    pending: users.filter(u => u.status === 'pending').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">Admin</p>
        <h1 className="text-lg font-kanit font-semibold text-foreground">User Management</h1>
        <p className="mt-2 text-muted-foreground text-sm">View and manage all registered users, roles, and subscriptions.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: stats.total, color: 'text-primary' },
          { label: 'Admins', value: stats.admins, color: 'text-violet-500' },
          { label: 'Approved', value: stats.approved, color: 'text-emerald-500' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card border border-border p-4">
            <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + refresh */}
      <div className="flex gap-3 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          className="flex-1 max-w-md w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
        />
        <button onClick={loadUsers} className="px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors">
          Refresh
        </button>
        {status && <span className="text-xs text-muted-foreground">{status}</span>}
      </div>

      {/* Users table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="loader" /></div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-24">Role</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-24">Tier</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-24">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-28">Auth Methods</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-28">Joined</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-foreground">{u.email}</span>
                    <span className="text-[0.6rem] text-muted-foreground block font-mono">{u.id}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={u.role}
                      onChange={e => updateUser(u.id, { role: e.target.value })}
                      className="bg-muted border border-border rounded px-1.5 py-0.5 text-[0.6rem] text-foreground focus:border-primary outline-none"
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={u.tier}
                      onChange={e => updateUser(u.id, { subscriptionTier: e.target.value })}
                      className="bg-muted border border-border rounded px-1.5 py-0.5 text-[0.6rem] text-foreground focus:border-primary outline-none"
                    >
                      <option value="free">Free</option>
                      <option value="tier1">Tier 1</option>
                      <option value="tier2">Tier 2</option>
                      <option value="tier3">Tier 3</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={u.status}
                      onChange={e => updateUser(u.id, { approvalStatus: e.target.value })}
                      className={`border rounded px-1.5 py-0.5 text-[0.6rem] font-semibold outline-none ${
                        u.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                        u.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                        'bg-red-500/10 border-red-500/20 text-red-500'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {u.auth.map(a => (
                        <span key={a} className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{a}</span>
                      ))}
                      {u.auth.length === 0 && <span className="text-[0.6rem] text-muted-foreground">none</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => deleteUser(u.id, u.email)}
                      className="text-[0.6rem] text-red-500 hover:text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    {search ? 'No users matching search' : 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[0.6rem] text-muted-foreground">
        {filtered.length} of {users.length} users shown
      </p>
    </div>
  )
}
