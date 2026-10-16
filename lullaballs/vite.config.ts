import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Windows file events sometimes miss quick consecutive saves; polling never does.
    watch: { usePolling: true, interval: 100 },
    proxy: { '/api': 'http://localhost:3001' },
  },
});
