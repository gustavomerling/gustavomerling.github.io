// Dev loop for the desktop build: Vite dev server (HMR) + Electron window pointing at it.
import { createServer } from 'vite';
import { buildElectron } from './build-electron.mjs';
import { launchElectron } from './electron.mjs';

const server = await createServer();
await server.listen();
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite dev server has no local URL');

await buildElectron({ dev: true });

const child = launchElectron(['.'], { VITE_DEV_SERVER_URL: url });

const shutdown = async () => {
  child.kill();
  await server.close();
  process.exit(0);
};
child.on('exit', shutdown);
process.on('SIGINT', shutdown);
