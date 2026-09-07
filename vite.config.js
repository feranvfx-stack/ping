import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // Listen on 0.0.0.0 — accessible from any device on the network
    port: 5173,
  },
})
