import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  // Load .env from project root (two levels up)
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '')
  const API_PORT = env.PORT || '3003'
  const API_URL = `http://localhost:${API_PORT}`

  return {
    base: '/genesis/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      proxy: {
        '/genesis/api': {
          target: API_URL,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: 1000,
      emptyOutDir: true,
    },
  }
})
