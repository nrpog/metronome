import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site is served from a subpath, not the domain root. Two settings have to agree with it:
// `base` decides the URLs written into index.html, and `outDir` puts the build inside a folder
// of that name so the deploy (which uploads dist/ to the document root) lands at /metronome/.
// Change both together, or the page loads and the assets 404.
const BASE_PATH = '/metronome/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: BASE_PATH,
  build: {
    outDir: `dist${BASE_PATH}`.replace(/\/$/, ''),
  },
})
