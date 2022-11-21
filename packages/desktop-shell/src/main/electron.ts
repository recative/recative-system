import path, { resolve } from 'path';
import isDev from 'electron-is-dev';
import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import { initializeServer } from './rpc';
import url, { fileURLToPath } from 'url';
import { existsSync } from 'fs';

initializeServer();

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, './index.html')}`
  );

  // Open the DevTools.
  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  protocol.interceptFileProtocol('file', (request, callback) => {
    let urlPath = request.url.slice('file://'.length).split('?')[0];
    if (existsSync(urlPath)) {
      callback(urlPath);
      return
    }
    urlPath = path.resolve(__dirname, urlPath.slice(1));
    if (existsSync(urlPath)) {
      callback(url.fileURLToPath('file://' + urlPath));
      return
    }
  });

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});