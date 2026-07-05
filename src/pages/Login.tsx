import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center text-white font-black text-lg font-kanit mb-3">
            AB
          </div>
          <h1 className="text-xl font-semibold text-foreground">Artificial Brain v3</h1>
          <p className="text-muted-foreground text-xs mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[0.7rem] font-medium text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-[0.7rem] font-medium text-muted-foreground mb-1">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-input px-3 py-2 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-muted-foreground text-xs mt-5">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
