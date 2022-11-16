import type { BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null = null;

export const setMainWindow = (x: BrowserWindow) => {
  mainWindow = x;
};

export const minimizeMainWindow = () => {
  if (!mainWindow) return;
  mainWindow.minimize();
};

export const maximizeMainWindow = () => {
  if (!mainWindow) return;
  mainWindow.maximize();
};

export const unmaximizeMainWindow = () => {
  if (!mainWindow) return;
  mainWindow.unmaximize();
};

export const isMainMaximized = () => {
  if (!mainWindow) return false;
  return mainWindow.isMaximized();
};

export const closeMainWindow = () => {
  if (!mainWindow) return;
  mainWindow.close();
};
