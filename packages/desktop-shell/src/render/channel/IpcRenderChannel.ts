/* eslint-disable class-methods-use-this */

// import { ipcRenderer } from 'electron';

import type { CallbackBasedChannel } from 'async-call-rpc';

const ipcRenderer = window.electron.ipcRenderer as Electron.IpcRenderer

type JSONRPCHandlerCallback = (data: unknown) => Promise<unknown>;

export class IpcRendererChannel implements CallbackBasedChannel {
  setup(callback: JSONRPCHandlerCallback) {
    const handleMessage = (_: Electron.IpcRendererEvent, data: unknown) => {
      callback(data)
        .then((x) => {
          if (x === undefined) return false;

          ipcRenderer.send('rpc-message', x);

          return true;
        })
        .catch((error) => {
          throw error;
        });
    };

    ipcRenderer.on('rpc-message', handleMessage);
    return () => ipcRenderer.off('rpc-message', handleMessage);
  }

  send(x: unknown): void {
    if (x === undefined) return;

    ipcRenderer.send('rpc-message', x);
  }
}