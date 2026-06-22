import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/v1': {
        target: 'https://llama.fmweb.space',
        changeOrigin: true,
        secure: true,
        timeout: 600000,
        proxyTimeout: 600000,
      },
    },
  },
})
