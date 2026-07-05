import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Fingerprint, Key, Lock, Eye, EyeOff, Check, SkipForward, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import PatternLock from '@/components/PatternLock'
import { api } from '@/lib/api'
import {
  isBiometricAvailable,
  registerBiometric,
} from '@/lib/biometricService'

const getWebAuthnChallenge = () => api.post('/auth/webauthn/challenge')
const registerWebAuthn = (cred: any) =>
  api.post('/auth/webauthn/register', { credential: cred })
const setupPassword = () => api.post('/auth/setup/password')
const setupPattern = (pattern: any) => api.post('/auth/setup/pattern', { pattern })

const S = { PENDING: 'pending', DONE: 'done', SKIPPED: 'skipped' } as const
type Status = (typeof S)[keyof typeof S]

export default function SetupLogin() {
  const navigate = useNavigate()
  const { user, refresh } = useAuth()

  const [bioStatus, setBioStatus]   = useState<Status>(S.PENDING)
  const [passStatus, setPassStatus] = useState<Status>(S.PENDING)
  const [patStatus, setPatStatus]   = useState<Status>(S.PENDING)

  const [showPass, setShowPass]       = useState(false)
  const [bioLoading, setBioLoading]   = useState(false)
  const [passLoading, setPassLoading] = useState(false)
  const [patLoading, setPatLoading]   = useState(false)
  const [showPattern, setShowPattern] = useState(false)
  const [error, setError]             = useState('')

  const password = sessionStorage.getItem('is_setup_password') || '(not available)'
  const allDone = [bioStatus, passStatus, patStatus].every(
    (s) => s !== S.PENDING,
  )

  const handleSetupBiometric = async () => {
    setError('')
    setBioLoading(true)
    try {
      const available = await isBiometricAvailable()
      if (!available) {
        setError('Biometric not available on this device/browser.')
        setBioStatus(S.SKIPPED)
        return
      }
      const {
        data: { challenge },
      } = await getWebAuthnChallenge()
      const credential = await registerBiometric(
        (user as any)?.id,
        (user as any)?.email,
        challenge,
      )
      await registerWebAuthn(credential)
      setBioStatus(S.DONE)
      await refresh()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Biometric setup failed')
    } finally {
      setBioLoading(false)
    }
  }

  const handleSetupPassword = async () => {
    setError('')
    setPassLoading(true)
    try {
      await setupPassword()
      setPassStatus(S.DONE)
      await refresh()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password setup failed')
    } finally {
      setPassLoading(false)
    }
  }

  const handlePatternComplete = async (pattern: number[]) => {
    setError('')
    setPatLoading(true)
    try {
      await setupPattern(pattern)
      setPatStatus(S.DONE)
      setShowPattern(false)
      await refresh()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Pattern setup failed')
    } finally {
      setPatLoading(false)
    }
  }

  const handleContinue = () => {
    sessionStorage.removeItem('is_setup_password')
    navigate('/dashboard')
  }

  const Badge = ({ status }: { status: Status }) => {
    if (status === S.DONE)
      return (
        <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
          <Check className="w-3 h-3" /> Done
        </span>
      )
    if (status === S.SKIPPED)
      return (
        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
          <SkipForward className="w-3 h-3" /> Skipped
        </span>
      )
    return null
  }

  const methods = [
    {
      icon: Fingerprint,
      label: 'Biometric Login',
      sub: 'Fingerprint · Face ID · Windows Hello',
      status: bioStatus,
      loading: bioLoading,
      onSetup: handleSetupBiometric,
      onSkip: () => setBioStatus(S.SKIPPED),
      extra: null as React.ReactNode,
    },
    {
      icon: Key,
      label: 'Password Login',
      sub: 'Same as your signup password',
      status: passStatus,
      loading: passLoading,
      onSetup: handleSetupPassword,
      onSkip: () => setPassStatus(S.SKIPPED),
      extra:
        passStatus === S.PENDING ? (
          <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-3 py-2.5 mb-3">
            <Key className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground font-mono text-sm flex-1 tracking-wider">
              {showPass ? password : '•'.repeat(Math.min(password.length, 12))}
            </span>
            <button
              onClick={() => setShowPass(!showPass)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        ) : null,
    },
    {
      icon: Lock,
      label: 'Pattern Login',
      sub: 'Draw a pattern on the 3×3 grid',
      status: patStatus,
      loading: patLoading,
      onSetup: () => setShowPattern(true),
      onSkip: () => setPatStatus(S.SKIPPED),
      extra:
        patStatus === S.PENDING && showPattern ? (
          <div className="flex flex-col items-center pt-2">
            <PatternLock onComplete={handlePatternComplete} />
            {patLoading && (
              <div className="mt-3 flex items-center gap-2 text-muted-foreground text-xs">
                <span className="spinner" /> Saving...
              </div>
            )}
          </div>
        ) : null,
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-md flex flex-col">
        <div className="mb-6 pt-2">
          <h1 className="font-head text-2xl font-bold text-foreground mb-1">
            Set Up Login
          </h1>
          <p className="text-muted-foreground text-sm">
            Choose your preferred login methods. You can skip any.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4 flex-1">
          {methods.map(
            ({ icon: Icon, label, sub, status, loading, onSetup, onSkip, extra }) => (
              <div key={label} className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold text-sm font-head">
                        {label}
                      </p>
                      <p className="text-muted-foreground text-xs">{sub}</p>
                    </div>
                  </div>
                  <Badge status={status} />
                </div>
                {extra}
                {status === S.PENDING && !(label === 'Pattern Login' && showPattern) && (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={onSetup}
                      disabled={loading}
                      className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2"
                    >
                      {loading && <span className="spinner" />} Set Up
                    </button>
                    <button onClick={onSkip} className="btn-ghost flex-1 text-sm py-2">
                      Skip
                    </button>
                  </div>
                )}
              </div>
            ),
          )}
        </div>

        <div className="pt-4">
          <button
            onClick={handleContinue}
            disabled={!allDone}
            className="btn-primary w-full disabled:opacity-30 py-3.5"
          >
            {allDone ? 'Go to Dashboard →' : 'Complete all options above'}
          </button>
          <p className="text-center text-muted-foreground text-xs mt-3">
            You can update login methods later in Settings.
          </p>
        </div>
      </div>
    </div>
  )
}
