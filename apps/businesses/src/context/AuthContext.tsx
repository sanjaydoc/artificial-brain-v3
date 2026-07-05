// Auth stub — always "logged in" as default user. No actual auth.
import { createContext, useContext, ReactNode } from 'react'

interface AuthState {
  user: { _id: string; username: string; role: string; email: string; displayName?: string; handle?: string; [key: string]: any } | null
  loading: boolean
  login: () => Promise<void>
  signup: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState>({
  user: { _id: '000000000000000000000001', username: 'brain', role: 'Admin', email: 'brain@local' },
  loading: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const value: AuthState = {
    user: { _id: '000000000000000000000001', username: 'brain', role: 'Admin', email: 'brain@local' },
    loading: false,
    login: async () => {},
    signup: async () => {},
    logout: () => {},
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
