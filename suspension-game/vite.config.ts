import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/suspension-game/dist/',
  build: { outDir: 'dist' },
})
