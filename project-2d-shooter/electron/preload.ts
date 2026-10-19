import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './ipc';

/**
 * The only surface the game sees of the desktop shell.
 * Keep it in sync with `DesktopBridge` in src/engine/platform/platform.ts.
 */
contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  quit: () => ipcRenderer.send(IPC.quit),
  setFullscreen: (value: boolean) => ipcRenderer.send(IPC.setFullscreen, value),
  isFullscreen: () => ipcRenderer.invoke(IPC.isFullscreen) as Promise<boolean>,
});
