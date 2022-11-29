import path from 'path';
import isDev from 'electron-is-dev';
import { existsSync } from 'fs';
import { initializeServer } from './rpc';
import { app, BrowserWindow, protocol } from 'electron';

initializeServer();

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'recative-media',
    privileges: {
      bypassCSP: true,
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function createWindow() {
  // Create the browser window.
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  window.setMenuBarVisibility(false);
  window.loadURL(
    isDev ? 'http://localhost:3000' : 'recative-media://root/index.html'
  );

  // Open the DevTools.
  if (isDev) {
    window.webContents.openDevTools({ mode: 'detach' });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  protocol.registerFileProtocol('recative-media', (request, callback) => {
    const parsedUrl = new URL(request.url, 'recative-media:///example.com');

    const relativePath = path.normalize(
      path.join(__dirname, '..', 'build', parsedUrl.pathname)
    );

    console.log(`::> R: ${request.url}, T: ${relativePath}`);

    return callback({
      path: existsSync(relativePath)
        ? relativePath
        : path.join(__dirname, '..', 'build', 'index.html'),
    });
  });

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  process.kill(0);
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
