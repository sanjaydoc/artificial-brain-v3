import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Fingerprint, Key, Lock, Eye, EyeOff, ArrowLeft, AlertTriangle, ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import PatternLock from '@/components/PatternLock'
import { api, setToken } from '@/lib/api'
import {
  isBiometricAvailable,
  authenticateBiometric,
} from '@/lib/biometricService'

const STEP = {
  EMAIL: 'email',
  CHOOSE: 'choose',
  PASSWORD: 'password',
  PATTERN: 'pattern',
  BIOMETRIC: 'biometric',
} as const
type Step = (typeof STEP)[keyof typeof STEP]

interface Methods {
  biometricEnabled: boolean
  passwordLoginEnabled: boolean
  patternEnabled: boolean
  credentialId?: string
}

// Source-API compat helpers — call raw api so v3 lib stays untouched
const getLoginMethods = (email: string) =>
  api.get(`/auth/login-methods?email=${encodeURIComponent(email)}`)
const loginPassword = (email: string, password: string) =>
  api.post('/auth/login/password', { email, password })
const loginPattern = (email: string, pattern: any) =>
  api.post('/auth/login/pattern', { email, pattern })
const getWebAuthnChallengePublic = (email: string) =>
  api.post('/auth/webauthn/challenge-public', { email })
const loginWebAuthn = (email: string, assertion: any) =>
  api.post('/auth/webauthn/login', { email, assertion })

export default function Login() {
  const navigate = useNavigate()
  const { refresh } = useAuth()

  const [step, setStep] = useState<Step>(STEP.EMAIL)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [methods, setMethods] = useState<Methods>({
    biometricEnabled: false,
    passwordLoginEnabled: false,
    patternEnabled: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Source's `login(token, user)` becomes: persist token, refresh from /auth/me
  const doLogin = async (token: string) => {
    setToken(token)
    await refresh()
    navigate('/dashboard')
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await getLoginMethods(email.trim())
      setMethods(data)
      setStep(STEP.CHOOSE)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Account not found')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await loginPassword(email, password)
      await doLogin(data.token)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid password')
    } finally {
      setLoading(false)
    }
  }

  const handlePatternComplete = async (pattern: number[]) => {
    setError('')
    setLoading(true)
    try {
      const { data } = await loginPattern(email, pattern)
      await doLogin(data.token)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Incorrect pattern')
      setLoading(false)
    }
  }

  const handleBiometricLogin = async () => {
    setError('')
    setLoading(true)
    try {
      if (!(await isBiometricAvailable()))
        throw new Error('Biometric not available on this device')
      const {
        data: { challenge, credentialId },
      } = await getWebAuthnChallengePublic(email)
      const assertion = await authenticateBiometric(challenge, credentialId)
      const { data } = await loginWebAuthn(email, assertion)
      await doLogin(data.token)
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Biometric login failed',
      )
    } finally {
      setLoading(false)
    }
  }

  const METHOD_CARDS = [
    {
      key: 'biometric',
      enabled: methods.biometricEnabled,
      icon: Fingerprint,
      label: 'Biometric',
      sub: 'Fingerprint · Face ID',
      action: () => {
        setStep(STEP.BIOMETRIC)
        handleBiometricLogin()
      },
    },
    {
      key: 'password',
      enabled: methods.passwordLoginEnabled,
      icon: Key,
      label: 'Password',
      sub: 'Enter your password',
      action: () => setStep(STEP.PASSWORD),
    },
    {
      key: 'pattern',
      enabled: methods.patternEnabled,
      icon: Lock,
      label: 'Pattern',
      sub: 'Draw your pattern',
      action: () => setStep(STEP.PATTERN),
    },
  ]

  return (
    <div className="min-h-screen flex flex-col hero-bg">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(59,130,246,0.10) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen p-6">
        {step !== STEP.EMAIL && (
          <button
            onClick={() => {
              setStep(step === STEP.CHOOSE ? STEP.EMAIL : STEP.CHOOSE)
              setError('')
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 mt-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          {step === STEP.EMAIL && (
            <div className="animate-fadeIn">
              <div className="mb-8 mt-10">
                <h1 className="font-head text-3xl font-bold text-foreground mb-2">
                  Welcome Back
                </h1>
                <p className="text-muted-foreground text-sm">
                  Enter your email to continue
                </p>
              </div>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
                >
                  {loading && <span className="spinner" />}
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </form>
              <p className="text-center text-muted-foreground text-sm mt-6">
                New here?{' '}
                <Link
                  to="/signup"
                  className="text-primary hover:text-blue-700 font-medium"
                >
                  Create account
                </Link>
              </p>
            </div>
          )}

          {step === STEP.CHOOSE && (
            <div className="animate-fadeIn">
              <div className="mb-6">
                <h1 className="font-head text-2xl font-bold text-foreground mb-1">
                  Choose Login Method
                </h1>
                <p className="text-muted-foreground text-sm">{email}</p>
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <div className="space-y-3">
                {METHOD_CARDS.map(
                  ({ key, enabled, icon: Icon, label, sub, action }) => (
                    <button
                      key={key}
                      onClick={action}
                      disabled={!enabled}
                      className={`w-full glass-card p-5 flex items-center gap-4 text-left transition-all duration-200 ${enabled ? 'hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-primary/10' : 'bg-white/5'}`}
                      >
                        <Icon
                          className={`w-5 h-5 ${enabled ? 'text-primary' : 'text-muted-foreground'}`}
                        />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`font-semibold font-head text-sm ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          {label}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {enabled ? sub : 'Not set up'}
                        </p>
                      </div>
                      {enabled && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {step === STEP.PASSWORD && (
            <div className="animate-fadeIn">
              <div className="mb-6">
                <h1 className="font-head text-2xl font-bold text-foreground mb-1">
                  Enter Password
                </h1>
                <p className="text-muted-foreground text-sm">{email}</p>
              </div>
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="input-field pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
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
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
                >
                  {loading && <span className="spinner" />} Sign In
                </button>
              </form>
            </div>
          )}

          {step === STEP.PATTERN && (
            <div className="animate-fadeIn">
              <div className="mb-6">
                <h1 className="font-head text-2xl font-bold text-foreground mb-1">
                  Draw Pattern
                </h1>
                <p className="text-muted-foreground text-sm">{email}</p>
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <div className="flex justify-center">
                <PatternLock onComplete={handlePatternComplete} />
              </div>
              {loading && (
                <p className="text-center text-muted-foreground text-sm mt-4 flex items-center justify-center gap-2">
                  <span className="spinner" /> Verifying...
                </p>
              )}
            </div>
          )}

          {step === STEP.BIOMETRIC && (
            <div className="text-center py-10 animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 animate-pulse">
                <Fingerprint className="w-10 h-10 text-primary" />
              </div>
              <h2 className="font-head text-xl font-bold text-foreground mb-2">
                Authenticate
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Use your fingerprint or face to sign in
              </p>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              {loading && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mt-4">
                  <span className="spinner" /> Waiting...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
