import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this project from a subpath (github.io/<repo>/), so `base` needs
// the repo name there. Vercel serves from the domain root and sets VERCEL=1 during its
// builds automatically, so we detect that and use '/' instead - no manual toggling
// needed between the two deploy targets. If you rename the repo, update the string
// below to match, e.g. '/my-repo-name/'.
export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL ? '/' : '/Spheres-of-Power-Character-sheet/',
})
