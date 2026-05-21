import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3001,
    open: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 3001,
    allowedHosts: [
      'dashboard.indipix.in',
      'www.dashboard.indipix.in',
      '64.227.150.214',
      'localhost',
      '127.0.0.1',
    ],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})

