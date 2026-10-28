import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages: o build commitado é servido em gustavomerling.github.io/merry-go-post/dist/
  base: '/merry-go-post/dist/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5190,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
});
