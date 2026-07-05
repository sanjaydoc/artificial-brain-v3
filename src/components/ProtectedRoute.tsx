import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  adminOnly?: boolean
}

export function ProtectedRoute({ children, adminOnly = false }: Props) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="loader-spinner loader-spinner-lg" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'Admin') return <Navigate to="/chat" replace />
  return <>{children}</>
}
