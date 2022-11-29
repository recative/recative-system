/* eslint-disable no-console */
/* eslint-disable no-restricted-globals */

/// <reference lib="es2020" />
/// <reference lib="WebWorker" />

import { OpenPromise } from '@recative/open-promise';
import { ResourceLoaderCacheLevel } from '@recative/definitions';
import type { IResourceItemForClient } from '@recative/definitions';

import { createServiceWorkerConnector } from './connector';

const sw = self as unknown as ServiceWorkerGlobalScope & typeof globalThis;

interface ResourceRequest {
  type: 'binaryById' | 'binaryByLabel' | 'metadataById' | 'metadataByLabel';
  parameter: string;
  promise: OpenPromise<Response>;
}

type Session = ReturnType<typeof createServiceWorkerConnector>;

const sessions = new Map<
string, // Session id
Session
>();
const sessionIdToResourceListMap = new Map<
string, // Session id
IResourceItemForClient[]
>();
const clientIdToSessionIdMap = new Map<
string, // Client id
string // Session id
>();
const requestQueue = new Map<
string, // Client id
Set<ResourceRequest>
>();

const NOT_FOUND_RESPONSE = new Response(JSON.stringify({}), {
  status: 404,
  headers: { 'Content-Type': 'application/json' },
});

const requestHandlers = {
  metadataById: (sessionId: string, parameter: string): Response => {
    console.log(
      `Received %cid.metadata%c request for ${parameter}`,
      'color: #00B0FF',
      'color: initial',
    );
    const resourceList = sessionIdToResourceListMap.get(sessionId);
    if (!resourceList) throw new Error('Client not ready');

    const targetResource = resourceList.find(
      (resource) => resource.id === parameter,
    );

    if (!targetResource) return NOT_FOUND_RESPONSE;
    return new Response(JSON.stringify(targetResource), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
  metadataByLabel: (sessionId: string, parameter: string): Response => {
    console.log(
      `Received %clabel.metadata%c request for ${parameter}`,
      'color: #00B0FF',
      'color: initial',
    );
    const resourceList = sessionIdToResourceListMap.get(sessionId);
    if (!resourceList) throw new Error('Client not ready');

    const targetResource = resourceList.find(
      (resource) => resource.label === parameter,
    );

    if (!targetResource) return NOT_FOUND_RESPONSE;
    return new Response(JSON.stringify(targetResource), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
  binaryById: (
    sessionId: string,
    parameter: string,
  ): Response | Promise<Response> => {
    console.log(
      `Received %cid.binary%c request for ${parameter}`,
      'color: #00B0FF',
      'color: initial',
    );
    const resourceList = sessionIdToResourceListMap.get(sessionId);
    const session = sessions.get(sessionId);
    if (!session || !resourceList) throw new Error('Client not ready');

    const targetResource = resourceList.find(
      (resource) => resource.id === parameter,
    );

    if (!targetResource) return NOT_FOUND_RESPONSE;

    return session.connector
      .fetchResource(parameter, ResourceLoaderCacheLevel.FetchCache)
      .then((blob) => new Response(blob));
  },
  binaryByLabel: (
    sessionId: string,
    parameter: string,
  ): Response | Promise<Response> => {
    console.log(
      `Received %clabel.binary%c request for ${parameter}`,
      'color: #00B0FF',
      'color: initial',
    );
    const resourceList = sessionIdToResourceListMap.get(sessionId);
    if (!resourceList) throw new Error('Client not ready');

    const targetResource = resourceList.find(
      (resource) => resource.label === parameter,
    );

    if (!targetResource) {
      return NOT_FOUND_RESPONSE;
    }

    return requestHandlers.binaryByLabel(sessionId, parameter);
  },
};

const scanRequestQueue = () => {
  requestQueue.forEach((requestSet, clientId) => {
    console.log(
      `Cleaning request queue for client %c${clientId}`,
      'color: #FF3D00',
    );
    const sessionId = clientIdToSessionIdMap.get(clientId);
    if (!sessionId) {
      console.log("but sessionId not found, won't do anything.");
      return;
    }

    const resource = sessionIdToResourceListMap.get(sessionId);
    if (!resource) {
      console.log("but resourceList not found, won't do anything.");
      return;
    }

    requestSet.forEach((request) => {
      const handler = requestHandlers[request.type];
      const response = handler(sessionId, request.parameter);

      request.promise.resolve(response);
      requestSet.delete(request);
    });
  });
};

sw.addEventListener('activate', (event) => {
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener('message', async (event) => {
  if (
    typeof event.data === 'object'
    && 'actPointHostSession' in event.data
    && typeof event.data.actPointHostSession === 'string'
  ) {
    const sessionId: string = event.data.actPointHostSession;
    console.log(`Got hand shake request from ${sessionId} via post message`);

    const connector = createServiceWorkerConnector(
      {
        updateResourceList: async (resourceList) => {
          console.log(`Updating resource list for ${sessionId}`);
          sessionIdToResourceListMap.set(sessionId, resourceList);
          scanRequestQueue();
        },
        destroy: () => {
          console.log(`Destroying session for ${sessionId}`);
          sessions.delete(sessionId);
          sessionIdToResourceListMap.delete(sessionId);

          const clientId = clientIdToSessionIdMap.get(sessionId);
          clientIdToSessionIdMap.delete(sessionId);

          const hangedRequests = requestQueue.get(clientId || '');
          hangedRequests?.forEach((request) => {
            request.promise.reject(new Error('Session destroyed'));
            hangedRequests.delete(request);
          });
        },
      },
      sessionId,
      event.ports[0],
    );

    console.log(
      `Sending session information to session %c${sessionId}`,
      'color: #6200EA',
    );
    event.ports[1].postMessage({ actPointServiceWorkerSession: sessionId });

    connector.connector.getResourceList().then((resourceList) => {
      sessionIdToResourceListMap.set(sessionId, resourceList);
      scanRequestQueue();
    });

    sessions.set(sessionId, connector);
  }
});

const getRequestType = (host: string) => {
  switch (host) {
    case 'id.binary.resource-manager':
      return 'binaryById' as const;
    case 'id.metadata.resource-manager':
      return 'metadataById' as const;
    case 'label.binary.resource-manager':
      return 'binaryByLabel' as const;
    case 'label.metadata.resource-manager':
      return 'metadataByLabel' as const;
    case 'register.resource-manager':
      return 'register' as const;
    default:
      return null;
  }
};

sw.addEventListener('fetch', (event) => {
  const { host, pathname } = new URL(event.request.url);
  const { clientId } = event;

  const parameter = pathname.substring(1);

  const requestType = getRequestType(host);

  if (!requestType) return;

  if (requestType === 'register') {
    const sessionId = parameter;
    const session = sessions.get(sessionId);

    if (!session) {
      console.warn(`Fail to register session ${sessionId}, since session not exists`);
      return;
    }

    session.channel.clientId = event.clientId;

    console.log(`Client ${clientId} connected`);
    clientIdToSessionIdMap.set(clientId, sessionId);
    scanRequestQueue();

    event.respondWith(new Response(JSON.stringify({})));

    return;
  }

  const sessionId = clientIdToSessionIdMap.get(clientId);

  console.log(
    `Received request: %c${host} %c${requestType}%c, sessionId: %c${sessionId}`,
    'color: #00B0FF',
    'color: #3D5AFE',
    'color: initial',
    'color: #00B8D4',
  );

  if (!sessionId || !sessionIdToResourceListMap.has(sessionId)) {
    console.log('Session not initialized, waiting for handshake');

    if (!requestQueue.has(clientId)) {
      requestQueue.set(clientId, new Set());
    }

    const hangedRequest = {
      type: requestType,
      parameter,
      promise: new OpenPromise<Response>(),
    };
    requestQueue.get(clientId)!.add(hangedRequest);
    event.respondWith(hangedRequest.promise.promise);

    return;
  }

  event.respondWith(requestHandlers[requestType](sessionId, parameter));
});
