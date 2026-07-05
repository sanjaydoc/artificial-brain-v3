// Auth stub — always "logged in" as default user. No actual auth.
import { createContext, useContext, type ReactNode } from 'react'

interface AuthCtx {
  user: { _id: string; username: string; email: string; role: string; displayName?: string; subscription?: any; [key: string]: any } | null
  loading: boolean
  login: (...args: any[]) => Promise<any>
  signup: (...args: any[]) => Promise<any>
  patternLogin: (...args: any[]) => Promise<any>
  logout: () => void
  refresh: () => Promise<any>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const value: AuthCtx = {
    user: {
      _id: '000000000000000000000001',
      username: 'brain',
      email: 'brain@local',
      role: 'Admin',
      isAdmin: true,
      displayName: 'Brain',
      subscriptionTier: 'tier3',
      subscription: { tier: 'Unlimited', status: 'active' },
      approvalStatus: 'approved',
      inventionCount: 0,
    },
    loading: false,
    login: async () => value.user,
    signup: async () => value.user,
    patternLogin: async () => value.user,
    logout: () => {},
    refresh: async () => value.user,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) return { user: { _id: '000000000000000000000001', username: 'brain', email: 'brain@local', role: 'Admin', displayName: 'Brain', subscription: { tier: 'Unlimited', status: 'active' } }, loading: false, login: async () => {}, signup: async () => {}, patternLogin: async () => {}, logout: () => {}, refresh: async () => null } as any
  return ctx
}
