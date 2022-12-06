import type { _AsyncVersionOf } from 'async-call-rpc'

import { createClientConnector } from '@recative/act-protocol';
import { createActPointConnector } from '@recative/resource-bridge';
import type { ServiceWorkerFunctions } from '@recative/resource-bridge';

import { connectToHost } from '../core/protocol';
import { FunctionalAtomDefinition } from '../core/AtomStore';
import {
  logHostFunctionsHooks,
  logResourceBridgeFunctionsHooks,
} from '../utils/log';

import { useStore, useResourceTracker, useContext } from './baseHooks';

export class ContextNotInitializedForProtocolConnectorError extends Error {
  name = 'ContextNotInitializedForProtocolConnectorError';

  constructor() {
    super('Context not initialized for protocol connector');
  }
}

export const HOST_FUNCTIONS_STORE = FunctionalAtomDefinition(() => {
  let context: ReturnType<typeof useContext> | null = null;
  let c: ReturnType<typeof createClientConnector> | null = null;

  logHostFunctionsHooks('Initialize host functions store');

  const getConnector = () => {
    if (!c) {
      if (!context) {
        throw new ContextNotInitializedForProtocolConnectorError();
      }

      logHostFunctionsHooks('Creating connector');
      const contentFunctions = connectToHost(context);
      c = createClientConnector(contentFunctions);
    }

    return c.connector;
  };

  return {
    setContext(x: ReturnType<typeof useContext>) {
      context = x;
    },

    result: {
      get connector() {
        return getConnector();
      },
      initialize: getConnector,
    },

    dispose() {
      if (c) {
        c.channel.destroy();
        c.destroy();
      }
      c = null;
      context = null;
    },
  };
});

export const useHostFunctions = () => {
  const context = useContext();
  const resourceTracker = useResourceTracker();

  const [getHostHooks] = useStore(HOST_FUNCTIONS_STORE);

  const hostHooks = getHostHooks();

  resourceTracker.track(hostHooks);
  hostHooks.setContext(context);

  return hostHooks.result;
};

const RESOURCE_BRIDGE_FUNCTIONS_STORE = FunctionalAtomDefinition(() => {
  let context: ReturnType<typeof useContext> | null = null;

  let b: ReturnType<typeof createActPointConnector> | null = null;
  let hostConnector:
    | ReturnType<typeof createClientConnector>['connector']
    | null = null;

  logResourceBridgeFunctionsHooks('Initialize resource bridge functions store');

  const getConnector = () => {
    if (!context) {
      throw new ContextNotInitializedForProtocolConnectorError();
    }

    if (!context.store.getValue(HOST_FUNCTIONS_STORE)) {
      context.store.register(HOST_FUNCTIONS_STORE);
    }

    if (!hostConnector) {
      hostConnector = context.store.getValue(HOST_FUNCTIONS_STORE).result.connector;
    }

    if (!b) {
      if (
        !('serviceWorker' in navigator)
        || !navigator.serviceWorker.controller
      ) {
        logHostFunctionsHooks(
          "Service worker not enabled in the browser, won't use resource bridge",
        );
        return null;
      }

      logHostFunctionsHooks('Creating resource bridge');
      b = createActPointConnector({
        fetchResource(resourceId, cacheLevel) {
          if (!hostConnector) {
            throw new ContextNotInitializedForProtocolConnectorError();
          }

          return hostConnector.fetchResource(resourceId, cacheLevel);
        },
        getResourceList() {
          if (!hostConnector) {
            throw new ContextNotInitializedForProtocolConnectorError();
          }

          return hostConnector.getResourceList();
        },
      });
    }

    return b.connector as _AsyncVersionOf<ServiceWorkerFunctions> | null;
  };

  return {
    setContext(x: ReturnType<typeof useContext>) {
      context = x;
    },

    result: {
      get connector() {
        return getConnector();
      },
      initialize: getConnector,
    },
    dispose() {
      if (b) {
        b.channel.destroy();
      }
      b = null;
      hostConnector = null;
      context = null;
    },
  };
});

export const useResourceBridgeFunctions = () => {
  const context = useContext();
  const resourceTracker = useResourceTracker();

  const [getResourceBridgeHooks] = useStore(RESOURCE_BRIDGE_FUNCTIONS_STORE);

  const resourceBridgeHooks = getResourceBridgeHooks();

  resourceTracker.track(resourceBridgeHooks);
  resourceBridgeHooks.setContext(context);

  return resourceBridgeHooks.result;
};
