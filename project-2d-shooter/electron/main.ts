import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'node:path';
import { IPC } from './ipc';

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let win: BrowserWindow | null = null;

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#000000',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // A game must keep ticking even when the window is behind another one.
      backgroundThrottling: false,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win?.show());

  // The game owns the whole keyboard: no reload/zoom/devtools shortcuts in production.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win?.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (DEV_SERVER_URL && input.key === 'F12') {
      win?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Never navigate away from the game or open new windows.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!DEV_SERVER_URL || !url.startsWith(DEV_SERVER_URL)) event.preventDefault();
  });

  if (DEV_SERVER_URL) {
    void win.loadURL(DEV_SERVER_URL);
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.on('closed', () => {
    win = null;
  });
}

function registerIpc(): void {
  ipcMain.on(IPC.quit, () => app.quit());
  ipcMain.on(IPC.setFullscreen, (_event, value: unknown) => win?.setFullScreen(value === true));
  ipcMain.handle(IPC.isFullscreen, () => win?.isFullScreen() ?? false);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  // No application menu: otherwise Ctrl/Alt+<key> could trigger menu accelerators mid-game.
  Menu.setApplicationMenu(null);

  void app.whenReady().then(() => {
    registerIpc();
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
