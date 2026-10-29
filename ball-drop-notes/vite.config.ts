import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages: o build commitado é servido em gustavomerling.github.io/ball-drop-notes/dist/
  base: '/ball-drop-notes/dist',
  plugins: [react()],
})
