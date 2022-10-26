/* eslint-disable max-classes-per-file */
import type { EventBasedChannel } from 'async-call-rpc';

import { logHost, logClient } from './log';

const isTransferable = (obj: object): obj is Transferable => {
  if (obj instanceof ArrayBuffer) {
    return true;
  }
  if (obj instanceof MessagePort) {
    return true;
  }
  // Safari does not support ImageBitmap
  if (
    typeof ImageBitmap !== 'undefined'
    && obj instanceof ImageBitmap
  ) {
    return true;
  }
  // The Streams are, surprisingly, transferable
  if (
    typeof ReadableStream !== 'undefined'
    && obj instanceof ReadableStream
  ) {
    return true;
  }
  if (
    typeof WritableStream !== 'undefined'
    && obj instanceof WritableStream
  ) {
    return true;
  }
  if (
    typeof TransformStream !== 'undefined'
    && obj instanceof TransformStream
  ) {
    return true;
  }
  // Note: Following objects from experimental API are also transferable
  // - AudioData and VideoFrame from WebCodecs API
  // - OffscreenCanvas
  // However we do not use and support them yet
  return false;
};

const extractTransferables = (data: unknown) => {
  const processedObjects = new Set();
  const pendingObjects: unknown[] = [data];
  const transferables: Transferable[] = [];
  while (pendingObjects.length > 0) {
    const obj = pendingObjects.shift();
    if (typeof obj !== 'object') {
      continue;
    }
    if (obj === null) {
      continue;
    }
    if (processedObjects.has(obj)) {
      continue;
    }
    processedObjects.add(obj);
    if (isTransferable(obj)) {
      transferables.push(obj);
      continue;
    }
    if (obj instanceof Set || obj instanceof Array) {
      pendingObjects.push(...obj);
      continue;
    }
    if (obj instanceof Map) {
      pendingObjects.push(...obj.keys());
      pendingObjects.push(...obj.values());
      continue;
    }
    if (Object.getPrototypeOf(obj) === Object.prototype) {
      // plain object
      pendingObjects.push(
        ...Object.keys(obj).map((key) => obj[key as keyof typeof obj]),
      );
      continue;
    }
    // Note: we can automatically transfer ArrayBuffer behind ArrayBufferView or TypedArray
    // but we choose to not do so.
  }
  return transferables;
};

type Listener = (data: unknown) => void;

export class DestroyedError extends Error {
  name = 'DestroyedError';

  constructor() {
    super('MessagePort channel is destroyed');
  }
}

export class MessagePortChannel implements EventBasedChannel {
  listeners: Set<Listener> = new Set();

  destroyed = false;

  constructor(protected port: MessagePort) {
    this.port = port;

    port.start();
  }

  on(listener: Listener): void | (() => void) {
    if (this.destroyed) throw new DestroyedError();

    this.listeners.add(listener);

    this.port.addEventListener('message', (event) => {
      listener(event.data);
    });
    this.port.start();
  }

  send(data: unknown): void {
    if (this.destroyed) throw new DestroyedError();

    this.port.postMessage(data, extractTransferables(data));
  }

  destroy() {
    this.destroyed = true;
    this.port.close();
    this.listeners.forEach((listener) => this.port.removeEventListener('message', listener));
  }
}

export class BatchedMessagePortChannel extends MessagePortChannel {
  private messageBuffer: unknown[] = [];

  timeout: number = -1;

  forceSendTask = () => {
    if (this.destroyed) return;

    this.port.postMessage(this.messageBuffer, extractTransferables(this.messageBuffer));
    this.messageBuffer = [];
    globalThis.clearTimeout(this.timeout);
    this.timeout = -1;
  };

  scheduleSendTask = () => {
    // If there is already a setTimeout, there is no need to do another setTimeout
    if (this.timeout < 0) {
      this.timeout = window.setTimeout(() => {
        this.forceSendTask();
      }, 1000 / 60);
    }
  };

  on = (listener: Listener): void | (() => void) => {
    if (this.destroyed) throw new DestroyedError();

    this.listeners.add(listener);

    this.port.addEventListener('message', (event) => {
      // For mobile platform, raf is not available when the iFrame is not shown.

      if (Array.isArray(event.data)) {
        event.data.forEach(listener);
      } else {
        listener(event.data);
      }
    });
    this.port.start();
  };

  send = (data: unknown): void => {
    if (this.destroyed) throw new DestroyedError();

    this.messageBuffer.push(data);
    if (this.messageBuffer.length > 2000) {
      this.forceSendTask();
    } else {
      this.scheduleSendTask();
    }
  };
}

export class LazyMessagePortChannel implements EventBasedChannel {
  ready = false;

  private channel: MessagePortChannel | null = null;

  private listenerBuffer: Set<Listener> = new Set();

  private messageBuffer: Set<unknown> = new Set();

  initialize(channel: MessagePortChannel) {
    this.ready = true;
    this.channel = channel;

    this.listenerBuffer.forEach((listener) => {
      channel.on(listener);
    });

    this.messageBuffer.forEach((message) => {
      this.send(message);
    });
  }

  on(listener: Listener): void {
    if (!this.channel) {
      this.listenerBuffer.add(listener);
      return;
    }

    this.channel.on(listener);
  }

  send(data: unknown): void {
    if (!this.channel) {
      this.messageBuffer.add(data);
      return;
    }

    this.channel.send(data);
  }

  destroy() {
    if (!this.channel) return;

    this.channel.destroy();
  }
}

export class IFramePortHostChannel extends LazyMessagePortChannel {
  private $iframe: HTMLIFrameElement | null;

  private origin: string;

  constructor(
    $iFrame: HTMLIFrameElement,
    origin = new URL($iFrame.src).origin,
    private msgId = 'iframe-request-host-port',
  ) {
    super();
    this.$iframe = $iFrame;
    this.origin = origin;

    window.addEventListener('message', this.onMessage);
  }

  onMessage = (event: MessageEvent) => {
    if (this.ready) return;
    if (event.data !== this.msgId) return;

    logHost('Received protocol connection request');


    if (!this.$iframe?.contentWindow) {
      throw new TypeError('Content window does not exists');
    }

    const messageChannel = new MessageChannel();
    const port = messageChannel.port1;
    const rpcChannel = new BatchedMessagePortChannel(port);

    this.initialize(rpcChannel);

    this.$iframe.contentWindow.postMessage(this.msgId, this.origin, [
      messageChannel.port2,
    ]);

    window.removeEventListener('message', this.onMessage);
  };

  destroy(): void {
    super.destroy();
    this.$iframe = null;
  }
}

export class IFramePortClientChannel extends LazyMessagePortChannel {
  constructor(private msgId = 'iframe-request-host-port') {
    super();

    window.addEventListener('message', this.onMessage);
    logClient('Sending protocol connection request');
    window.parent.postMessage(msgId, '*');
  }

  onMessage = (event: MessageEvent) => {
    if (this.ready) return;
    if (event.data !== this.msgId) return;

    logClient('Received protocol port');
    const rpcChannel = new BatchedMessagePortChannel(event.ports[0]);

    this.initialize(rpcChannel);

    window.removeEventListener('message', this.onMessage);
  };
}
