import { AsyncCall } from 'async-call-rpc';
import { debug } from 'debug';
import type { Server } from '../../main/rpc';

import { IpcRendererChannel } from './IpcRenderChannel';

const channel = new IpcRendererChannel();

const logRenderIpc = debug('desktop-shell:renderer-ipc');

export const server = AsyncCall<Server>(
  {},
  {
    channel,
    logger: { log: logRenderIpc },
    log: { sendLocalStack: true, type: 'pretty' },
  }
);
