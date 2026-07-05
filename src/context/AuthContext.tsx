import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { authApi, getToken, setToken, type UserDoc } from '@/lib/api'

interface AuthCtx {
  user: UserDoc | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<UserDoc>
  signup: (email: string, password: string) => Promise<UserDoc>
  logout: () => void
  refresh: () => Promise<UserDoc | null>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDoc | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return null
    }
    try {
      const { user: u } = await authApi.me()
      setUser(u)
      return u
    } catch {
      setToken(null)
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const login = async (email: string, password: string) => {
    const { token, user: u } = await authApi.login({ email, password })
    setToken(token)
    setUser(u)
    return u
  }

  const signup = async (email: string, password: string) => {
    const { token, user: u } = await authApi.signup({ email, password })
    setToken(token)
    setUser(u)
    return u
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const isAdmin = user?.role === 'Admin'

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
