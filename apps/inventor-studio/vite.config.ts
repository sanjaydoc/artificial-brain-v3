import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '')
  const API_PORT = env.PORT || '3003'
  const API_URL = `http://localhost:${API_PORT}`

  return {
    base: '/inventor-studio/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5176,
      proxy: {
        '/api': {
          target: API_URL,
          changeOrigin: true,
          ws: false,
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
