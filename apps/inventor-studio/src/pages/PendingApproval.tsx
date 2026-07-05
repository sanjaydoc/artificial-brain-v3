import { useNavigate } from 'react-router-dom'
import { Zap, Clock, LogOut, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function PendingApproval() {
  const { user, logout, refresh } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState(false)

  const checkStatus = async () => {
    setChecking(true)
    try {
      const u = await refresh()
      const approved = (u as any)?.isApproved ?? (u as any)?.is_approved
      if (approved) {
        navigate('/dashboard')
      } else {
        setChecked(true)
        setTimeout(() => setChecked(false), 3000)
      }
    } catch {
      /* silent */
    }
    setChecking(false)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(59,130,246,0.3)',
            }}
          >
            <Zap size={26} color="#000" fill="#000" />
          </div>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 20,
            padding: '6px 16px',
            marginBottom: 24,
          }}
        >
          <Clock size={14} color="#3b82f6" />
          <span
            style={{
              fontSize: 13,
              color: '#3b82f6',
              fontWeight: 600,
              fontFamily: 'Kanit, sans-serif',
            }}
          >
            Pending Admin Approval
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'Kanit, sans-serif',
            fontWeight: 800,
            fontSize: 32,
            color: 'var(--foreground)',
            marginBottom: 16,
          }}
        >
          Almost there!
        </h1>

        <p
          style={{
            color: 'var(--muted-foreground)',
            fontSize: 15,
            lineHeight: 1.7,
            marginBottom: 12,
          }}
        >
          Your account{' '}
          <strong style={{ color: 'var(--foreground)' }}>{user?.email}</strong> is waiting for
          admin approval. You'll be able to start inventing as soon as it's
          approved.
        </p>

        <p
          style={{
            color: 'var(--muted-foreground)',
            fontSize: 13,
            lineHeight: 1.6,
            marginBottom: 40,
          }}
        >
          Approvals typically happen within a few hours. You can check back anytime
          by clicking the button below.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={checkStatus}
            disabled={checking}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '13px',
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {checking ? (
              <>
                <span className="spinner" /> Checking...
              </>
            ) : checked ? (
              <><Clock size={14} className="inline" /> Still pending — check again later</>
            ) : (
              <>
                <RefreshCw size={16} /> Check Approval Status
              </>
            )}
          </button>

          <button
            onClick={logout}
            className="btn-ghost"
            style={{
              width: '100%',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>

        <div
          style={{
            marginTop: 40,
            padding: 20,
            borderRadius: 14,
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
            Inventor Studio is a product of{' '}
            <strong style={{ color: 'var(--muted-foreground)' }}>KLabs</strong>. Once approved,
            you'll receive 3 free inventions. Need help? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
