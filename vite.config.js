import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    port: process.env.PORT || 4173,
    host: true,
    allowedHosts: ['gpt-visualizer.onrender.com']
  }
})
