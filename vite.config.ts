import { defineConfig, Plugin, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Sub-app SPA fallback plugin
function subAppFallback(): Plugin {
  return {
    name: 'sub-app-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url || ''
        if (url.startsWith('/businesses') && !url.includes('.') && !url.startsWith('/businesses/api')) {
          req.url = '/businesses/index.html'
        } else if (url.startsWith('/inventor-studio') && !url.includes('.') && !url.startsWith('/inventor-studio/api')) {
          req.url = '/inventor-studio/index.html'
        }
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const API_PORT = env.PORT || '3003'
  const CLIENT_PORT = parseInt(new URL(env.CLIENT_URL || 'http://localhost:5173').port || '5173')
  const API_URL = `http://localhost:${API_PORT}`
  const WS_URL = `ws://localhost:${API_PORT}`

  return {
    plugins: [react(), subAppFallback()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: CLIENT_PORT,
      proxy: {
        '/api': {
          target: API_URL,
          changeOrigin: true,
          configure(proxy) { proxy.on('error', () => {}) },
        },
        '/ws': {
          target: WS_URL,
          ws: true,
          configure(proxy) { proxy.on('error', () => {}) },
        },
        '/agent-ws': {
          target: WS_URL,
          ws: true,
          timeout: 0,
          configure(proxy) { proxy.on('error', () => {}) },
        },
        '/camera': {
          target: API_URL,
          changeOrigin: true,
          configure(proxy) { proxy.on('error', () => {}) },
        },
        '/businesses/api': {
          target: API_URL,
          changeOrigin: true,
          configure(proxy) { proxy.on('error', () => {}) },
        },
        '/inventor-studio/api': {
          target: API_URL,
          changeOrigin: true,
          configure(proxy) { proxy.on('error', () => {}) },
        },
        '/genesis/api': {
          target: API_URL,
          changeOrigin: true,
          configure(proxy) { proxy.on('error', () => {}) },
        },
        // In dev mode, proxy sub-app pages to their Vite dev servers for HMR
        '/genesis': {
          target: 'http://localhost:5174',
          changeOrigin: true,
          configure(proxy) {
            proxy.on('error', () => {}) // silent if sub-app dev server not running
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: 1000,
    },
  }
})
