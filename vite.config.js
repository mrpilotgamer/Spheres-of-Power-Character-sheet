import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed on Vercel only, served from the domain root.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
