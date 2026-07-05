// Stub — no auth, always renders children
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  adminOnly?: boolean
}

export function ProtectedRoute({ children }: Props) {
  return <>{children}</>
}
