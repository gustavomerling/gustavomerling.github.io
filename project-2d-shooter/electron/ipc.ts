/** IPC channel names shared by the main process and the preload bridge. */
export const IPC = {
  quit: 'platform:quit',
  setFullscreen: 'platform:set-fullscreen',
  isFullscreen: 'platform:is-fullscreen',
} as const;
