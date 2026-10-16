import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://gustavomerling.github.io/pointer-survivor/dist/
export default defineConfig({
  base: '/pointer-survivor/dist/',
  plugins: [react()],
})
