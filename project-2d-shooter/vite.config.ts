import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const pkg = JSON.parse(readFileSync(r('./package.json'), 'utf8')) as { version: string };

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
].join('; ');

/** Strict Content-Security-Policy for the packaged game only (dev needs inline React Refresh scripts). */
function cspOnBuild(): Plugin {
  return {
    name: 'csp-on-build',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig({
  // Relative base: works both for the packaged game (file://) and under the GitHub Pages subpath.
  base: './',
  plugins: [react(), cspOnBuild()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@engine': r('./src/engine'),
      '@game': r('./src/game'),
      '@ui': r('./src/ui'),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    // Windows file events sometimes miss quick consecutive saves; polling never does.
    watch: { usePolling: true, interval: 100 },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome120',
    minify: 'esbuild',
    cssCodeSplit: true,
    assetsInlineLimit: 400,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Function form: the object form is not in the installed Rollup types.
        manualChunks: (id) => (id.includes('node_modules/react') || id.includes('node_modules/scheduler') ? 'vendor' : undefined),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
