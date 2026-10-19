/** Shape of `window.desktop`, exposed by electron/preload.ts. */
export interface DesktopBridge {
  isDesktop: true;
  quit(): void;
  setFullscreen(value: boolean): void;
  isFullscreen(): Promise<boolean>;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

/**
 * Everything that differs between the desktop build (Electron) and the browser.
 * Game code talks to this, never to `window.desktop` or the Fullscreen API directly.
 */
export const platform = {
  get isDesktop(): boolean {
    return window.desktop?.isDesktop === true;
  },

  /** Desktop only; in the browser the menu hides the "Sair" option. */
  quit(): void {
    window.desktop?.quit();
  },

  async isFullscreen(): Promise<boolean> {
    if (window.desktop) return window.desktop.isFullscreen();
    return document.fullscreenElement !== null;
  },

  async setFullscreen(value: boolean): Promise<void> {
    if (window.desktop) {
      window.desktop.setFullscreen(value);
      return;
    }
    if (value && !document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => undefined);
    if (!value && document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
  },
};
