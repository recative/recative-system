import { AsyncCall, batch } from 'async-call-rpc';

import { logClient, logConnector, logHost } from './log';
import { IFramePortHostChannel, IFramePortClientChannel } from './messagePortChannel';
import type { HostFunctions, ContentFunctions } from './protocol';

const raf = (cb: FrameRequestCallback) => {
  if ('requestAnimationFrame' in globalThis) {
    return globalThis.requestAnimationFrame(cb);
  } else {
    return globalThis.setTimeout(cb, 0);
  }
}

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
  const [connector, emit] = batch(AsyncCall<ContentFunctions>(functions, {
    channel,
    logger: { log: logHost },
    log: { sendLocalStack: true, type: 'pretty' },
  }));

  const tick = () => {
    if (destroyed) return;
    emit();
    raf(tick);
  }

  tick();

  return { connector, channel, destroy };
};

export const createClientConnector = (functions: ContentFunctions) => {
  let destroyed = false;

  const destroy = () => {
    destroyed = true;
    logConnector('Destroying connector');
  }

  logConnector('Creating client connector');
  const channel = new IFramePortClientChannel();
  const [connector, emit] = batch(AsyncCall<HostFunctions>(functions, {
    channel,
    logger: { log: logClient },
    log: { sendLocalStack: true, type: 'pretty' },
  }));

  const tick = () => {
    if (destroyed) return;
    emit();
    raf(tick);
  }

  tick();

  return { connector, channel, destroy };
};
