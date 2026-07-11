import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: GitHub Pages serves a project site from https://<user>.github.io/<repo-name>/
// so `base` must match your repo name exactly (with leading and trailing slashes).
// If you rename the repo, update this to match, e.g. base: '/my-repo-name/'.
// If you use a custom domain or a *user* page (repo named <user>.github.io), set base: '/'.
export default defineConfig({
  plugins: [react()],
  base: '/Spheres-of-Power-Character-sheet/',
})
