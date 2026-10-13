import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// App served from https://gustavomerling.github.io/fps/dist/
// Dev mirrors production: http://localhost:5173/fps/dist/
export default defineConfig({
  base: '/fps/dist/',
  plugins: [react()],
})
