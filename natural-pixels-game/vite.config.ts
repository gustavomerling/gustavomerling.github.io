import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works from https://gustavomerling.github.io/natural-pixels-game/dist/
  base: './',
  plugins: [react()],
})
