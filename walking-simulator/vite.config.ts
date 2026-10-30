import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages: o build commitado é servido em gustavomerling.github.io/walking-simulator/dist/
  base: '/walking-simulator/dist',
  plugins: [react(), tailwindcss()],
  // Workers em ES modules: o worker de treino cria sub-workers de avaliação.
  worker: { format: 'es' },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})
