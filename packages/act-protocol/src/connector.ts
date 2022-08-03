import { AsyncCall } from 'async-call-rpc';

import { logClient, logConnector, logHost } from './log';
import { IFramePortHostChannel, IFramePortClientChannel } from './messagePortChannel';
import type { HostFunctions, ContentFunctions } from './protocol';

export const createHostConnector = (
  functions: HostFunctions,
  $iFrame: HTMLIFrameElement,
) => {
  logConnector('Creating host connector');
  const channel = new IFramePortHostChannel($iFrame);
  const connector = AsyncCall<ContentFunctions>(functions, {
    channel,
    logger: { log: logHost },
    log: { sendLocalStack: true },
  });

  return { connector, channel };
};

export const createClientConnector = (functions: ContentFunctions) => {
  logConnector('Creating client connector');
  const channel = new IFramePortClientChannel();
  const connector = AsyncCall<HostFunctions>(functions, {
    channel,
    logger: { log: logClient },
    log: { sendLocalStack: true },
  });

  return { connector, channel };
};
