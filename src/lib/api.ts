import axios, { AxiosError } from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

const TOKEN_KEY = 'brain_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const t = getToken()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401 && getToken()) setToken(null)
    return Promise.reject(err)
  },
)

// Types
export type Role = 'User' | 'Admin'

export interface UserDoc {
  id: string
  email: string
  role: Role
  isAdmin?: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  token: string
  user: UserDoc
}

export const authApi = {
  signup: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/signup', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  me: () => api.get<{ user: UserDoc }>('/auth/me').then((r) => r.data),
}
