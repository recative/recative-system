import { AsyncCall } from 'async-call-rpc';
import type { Server } from '../../main/rpc';

import { IpcRendererChannel } from './IpcRenderChannel';

const channel = new IpcRendererChannel();

export const server = AsyncCall<Server>({}, { channel });