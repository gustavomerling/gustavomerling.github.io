// Launches Electron with the given args, with a clean environment.
// VS Code (and other Electron hosts) export ELECTRON_RUN_AS_NODE=1, which would make
// Electron behave like plain Node and never open a window.
import { spawn } from 'node:child_process';
import electronPath from 'electron';

/** @param {string[]} args @param {Record<string, string>} [extraEnv] */
export function launchElectron(args, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  delete env.ELECTRON_RUN_AS_NODE;
  return spawn(String(electronPath), args, { stdio: 'inherit', env });
}

if (process.argv[1]?.endsWith('electron.mjs')) {
  const child = launchElectron(process.argv.slice(2));
  child.on('exit', (code) => process.exit(code ?? 1));
}
