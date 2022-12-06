import { AsyncCall } from 'async-call-rpc';

import { logClient, logConnector, logHost } from './log';
import { IFramePortHostChannel, IFramePortClientChannel } from './messagePortChannel';
import type { HostFunctions, ContentFunctions } from './protocol';

export const createHostConnector = (
  functions: HostFunctions,
  $iFrame: HTMLIFrameElement,
) => {
  let destroyed = false;

  const destroy = () => {
    destroyed = true;
    logConnector('Destroying connector');
  }

  logConnector('Creating host connector');
  const channel = new IFramePortHostChannel($iFrame);
  const connector = AsyncCall<ContentFunctions>(functions, {
    channel,
    logger: { log: logHost },
    log: { sendLocalStack: true, type: 'pretty' },
  });

  return {
    connector,
    channel,
    destroy,
    get destroyed() {
      return destroyed
    }
  };
};

export const createClientConnector = (functions: ContentFunctions) => {
  let destroyed = false;

  const destroy = () => {
    destroyed = true;
    logConnector('Destroying connector');
  }

  logConnector('Creating client connector');
  const channel = new IFramePortClientChannel();
  const connector = AsyncCall<HostFunctions>(functions, {
    channel,
    logger: { log: logClient },
    log: { sendLocalStack: true, type: 'pretty' },
  });

  return {
    connector,
    channel,
    destroy,
    get destroyed() {
      return destroyed
    }
  };
};
