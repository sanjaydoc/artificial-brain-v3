import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '')
  const API_PORT = env.PORT || '3003'
  const API_URL = `http://localhost:${API_PORT}`

  return {
    base: '/businesses/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5175,
      proxy: {
        '/api': {
          target: API_URL,
          changeOrigin: true,
          ws: false,
          configure(proxy) {
            proxy.on('error', (err: NodeJS.ErrnoException) => {
              if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') return
            })
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: 1200,
      emptyOutDir: true,
    },
  }
})
