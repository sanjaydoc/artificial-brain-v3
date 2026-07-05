import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Zap, AlertTriangle, ArrowLeft } from 'lucide-react'
import { api, setToken } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

const signup = (email: string, password: string) =>
  api.post('/auth/signup', { email, password })

export default function Signup() {
  const navigate = useNavigate()
  const { refresh } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 8) return setError('Password must be at least 8 characters')

    setLoading(true)
    try {
      const { data } = await signup(email.trim(), password)
      sessionStorage.setItem('is_setup_password', password)
      setToken(data.token)
      await refresh()
      navigate('/setup-login')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col hero-bg">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(59,130,246,0.10) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen p-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 mt-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40 mb-5">
              <Zap className="w-6 h-6 text-black" fill="black" />
            </div>
            <h1 className="font-head text-3xl font-bold text-foreground mb-2">
              Create Account
            </h1>
            <p className="text-muted-foreground text-sm">Join Inventor Studio ASI</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-muted-foreground text-xs mb-1.5 font-medium uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-muted-foreground text-xs mb-1.5 font-medium uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-muted-foreground text-xs mb-1.5 font-medium uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="input-field"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
            >
              {loading && <span className="spinner" />}
              Create Account
            </button>
          </form>

          <p className="text-center text-muted-foreground text-sm mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-blue-700 font-medium"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
