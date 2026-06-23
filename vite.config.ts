import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const comfy = {
  target: 'https://comfy.fmweb.xyz',
  changeOrigin: true,
  secure: true,
  timeout: 600000,
  proxyTimeout: 600000,
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/v1': {
        target: 'https://llama.fmweb.xyz',
        changeOrigin: true,
        secure: true,
        timeout: 600000,
        proxyTimeout: 600000,
      },
      '/api': {
        target: 'https://llama.fmweb.xyz',
        changeOrigin: true,
        secure: true,
        timeout: 600000,
        proxyTimeout: 600000,
      },
      '/prompt': comfy,
      '/upload': comfy,
      '/history': comfy,
      '/view': comfy,
    },
  },
})
