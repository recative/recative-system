/// <reference lib="es2020" />
/// <reference lib="WebWorker" />

import { nanoid } from 'nanoid';
import {
  MessagePortChannel,
  LazyMessagePortChannel,
} from '@recative/act-protocol';

import { logActPointChannel } from './log';

export class ActPointHostChannel extends LazyMessagePortChannel {
  serviceWorker = navigator.serviceWorker.controller;

  readonly sessionId = nanoid();

  private handshakePort: MessagePort;

  constructor() {
    super();

    const handshakeChannel = new MessageChannel();
    this.handshakePort = handshakeChannel.port1;
    this.handshakePort.addEventListener('message', this.onMessage);
    this.handshakePort.start();

    if (!this.serviceWorker) {
      console.warn("Resource Manager is not configured, won't initialize it.");
      return;
    }

    const messageChannel = new MessageChannel();
    const port = messageChannel.port1;
    const rpcChannel = new MessagePortChannel(port);

    this.initialize(rpcChannel);

    this.serviceWorker.postMessage(
      {
        actPointHostSession: this.sessionId,
      },
      [messageChannel.port2, handshakeChannel.port2],
    );
  }

  onMessage = (event: MessageEvent) => {
    if (
      typeof event.data === 'object'
      && 'actPointServiceWorkerSession' in event.data
      && event.data.actPointServiceWorkerSession === this.sessionId
    ) {
      logActPointChannel(
        `Handshake with service worker to session ${this.sessionId} via HTTP request`,
      );
      fetch(`${window.location.protocol}//register.resource-manager/${this.sessionId}`);
      this.handshakePort.removeEventListener('message', this.onMessage);
    }
  };
}

export class ResourceServiceWorkerChannel extends LazyMessagePortChannel {
  private sw = globalThis as unknown as ServiceWorkerGlobalScope &
    typeof globalThis;

  clientId: string | null = null;

  readonly sessionId: string;

  constructor(
    sessionId: string,
    port: MessagePort,
  ) {
    super();

    this.sessionId = sessionId;

    const rpcChannel = new MessagePortChannel(port);
    this.initialize(rpcChannel);
  }
}
