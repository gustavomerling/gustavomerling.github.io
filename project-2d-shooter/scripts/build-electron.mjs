// Bundles the Electron main + preload scripts (TypeScript) into CommonJS under dist-electron/.
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

/** @param {{ dev?: boolean }} [options] */
export async function buildElectron({ dev = false } = {}) {
  await build({
    entryPoints: { main: 'electron/main.ts', preload: 'electron/preload.ts' },
    outdir: 'dist-electron',
    outExtension: { '.js': '.cjs' },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron'],
    sourcemap: dev,
    minify: !dev,
    logLevel: 'warning',
  });
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  await buildElectron();
  console.log('electron: dist-electron/ ok');
}
