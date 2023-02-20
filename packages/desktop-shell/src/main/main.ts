import path from 'path';
import isDev from 'electron-is-dev';
import fs, { existsSync } from 'fs-extra';
import { initializeServer } from './rpc';
import { app, BrowserWindow, protocol } from 'electron';
import { customProtocolName } from '../config';

const constantsPath = path.normalize(
  path.join(__dirname, '..', isDev ? 'public' : 'build', `/constants.json`)
);
try {
  Reflect.set(globalThis, 'constant', fs.readJsonSync(constantsPath));
} catch {}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(customProtocolName, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(customProtocolName);
}

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

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Create the browser window.
  const window = new BrowserWindow({
    fullscreen: true,
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

  if (mainWindow) {
    mainWindow.close();
  }
  mainWindow = window;
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

function handleCustomUrl(url: string) {
  console.error('open-url', url);
  mainWindow?.webContents.send('open-url', url);
}

// For custom protocol on none-Windows
app.on('open-url', (event, url) => {
  handleCustomUrl(url);
});

// For custom protocol on Windows
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  handleCustomUrl(commandLine[commandLine.length - 1]);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
