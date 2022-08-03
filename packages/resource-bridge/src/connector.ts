import { AsyncCall } from 'async-call-rpc';

import { logActPoint, logConnector, logServiceWorker } from './log';
import { ActPointHostChannel, ResourceServiceWorkerChannel } from './Channel';
import type { ActPointFunctions, ServiceWorkerFunctions } from './protocol';

export const createActPointConnector = (
  functions: ActPointFunctions,
) => {
  logConnector('Creating host connector');
  const channel = new ActPointHostChannel();
  const connector = AsyncCall<ServiceWorkerFunctions>(functions, {
    channel, logger: { log: logActPoint },
  });

  return { connector, channel };
};

export const createServiceWorkerConnector = (
  functions: ServiceWorkerFunctions,
  sessionId: string,
  port: MessagePort,
) => {
  logConnector('Creating client connector');
  const channel = new ResourceServiceWorkerChannel(
    sessionId,
    port,
  );
  const connector = AsyncCall<ActPointFunctions>(functions, {
    channel, logger: { log: logServiceWorker },
  });

  return { connector, channel };
};
