import { AsyncCall } from 'async-call-rpc';

import * as server from './server';

import { IpcMainChannel } from './channel/IpcMainChannel';

export type Server = typeof server;

export const initializeServer = () => {
  const channel = new IpcMainChannel();
  AsyncCall(server, {
    channel,
    log: {
      beCalled: false,
      sendLocalStack: true,
    },
  });
};
