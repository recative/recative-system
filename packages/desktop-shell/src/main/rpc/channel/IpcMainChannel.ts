/* eslint-disable class-methods-use-this */

import { ipcMain } from 'electron';

import type { CallbackBasedChannel } from 'async-call-rpc';

type JSONRPCHandlerCallback = (data: unknown) => Promise<unknown>;

export class IpcMainChannel implements CallbackBasedChannel {
  setup(callback: JSONRPCHandlerCallback) {
    const handleMessage = (event: Electron.IpcMainEvent, data: unknown) => {
      callback(data)
        .then((x) => {
          if (!x) return false;

          event.reply('rpc-message', x);

          return true;
        })
        .catch((error) => {
          throw error;
        });
    };

    ipcMain.on('rpc-message', handleMessage);

    return () => ipcMain.off('rpc-message', handleMessage);
  }
}