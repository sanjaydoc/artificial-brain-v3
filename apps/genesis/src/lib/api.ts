import axios from 'axios'

export const api = axios.create({ baseURL: '/genesis/api' })

export function getToken(): string | null {
  return localStorage.getItem('brain_token')
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('brain_token')
    }
    return Promise.reject(err)
  },
)
