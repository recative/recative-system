import EventTarget from '@ungap/event-target';

import { AsyncCall, _AsyncVersionOf } from 'async-call-rpc';

import { OpenPromise } from '@recative/open-promise';
import { IFramePortHostChannel } from "@recative/act-protocol";

import { logHost } from './log';
import type { ManagedAp } from './managedAp';

export interface IErrorEventDetail {
  code: string;
  message: string;
  stack?: string;
  reason: string
}

export class ErrorEvent extends CustomEvent<IErrorEventDetail> {
  constructor(
    code: string,
    message: string,
    stack: string | undefined,
    reason: string
  ) {
    super('error', { detail: { code, message, stack, reason } });
  }
}

export const ErrorEventDispatcher = (
  eventTarget: EventTarget,
  reason: string
) => {
  return (code: string, message: string, stack: string | undefined) => {
    const errorEvent = new ErrorEvent(code, message, stack, reason);
    logHost('An error occurred', errorEvent);
    eventTarget.dispatchEvent(errorEvent);
  }
}

export class ApManagerInstance extends EventTarget {
  readonly iFrame = document.createElement('iframe');

  readonly channel: IFramePortHostChannel;

  readonly connector: _AsyncVersionOf<ManagedAp['functions']>;

  readonly ready = new OpenPromise<HTMLIFrameElement>();

  serviceWorkerRegistered = false;

  identity = '';

  readonly functions = {
    apError: ErrorEventDispatcher(this, 'ap'),
    scriptLoadingError: ErrorEventDispatcher(this, 'script-loading'),
    serviceWorkerRegisterError: ErrorEventDispatcher(this, 'sw-register'),
    serviceWorkerRegistered: () => {
      this.serviceWorkerRegistered = true;
    },
    ready: () => {
      logHost(`AP instance is ready`);
      this.ready.resolve(this.iFrame);
    },
    getConstants: () => this.constants,
  }

  constructor(
    readonly clientSrc: string,
    readonly container: HTMLDivElement,
    private readonly constants: Record<string, unknown>
  ) {
    super();

    logHost(
      'Initializing ApManagerInstance with src:',
      clientSrc,
      'frame:',
      this.iFrame
    );

    const randomId = Math.random().toString(36).replace('0.', 'c-');

    const iFrameUrl = new URL(clientSrc, window.location.href);
    iFrameUrl.searchParams.set('channelId', randomId);

    this.iFrame.src = iFrameUrl.toString();
    this.iFrame.title = 'Interactive Content';
    container.append(this.iFrame);

    const channel = new IFramePortHostChannel(
      this.iFrame,
      new URL(clientSrc, window.location.href).origin,
      `@recative/ap-manager/message/${randomId}`,
      false
    );

    this.channel = channel;

    this.connector = AsyncCall<ManagedAp['functions']>(
      this.functions,
      {
        channel,
        logger: { log: logHost },
        log: { sendLocalStack: true, type: 'pretty' },
      }
    );
  }

  destroy = () => {
    this.iFrame.src = 'about:blank';
    this.channel.destroy();
  }
}

export class ApManagerSource {
  private availableInstances = new Set<ApManagerInstance>();

  private occupiedInstances = new Set<ApManagerInstance>();

  private container = document.createElement('div');

  get totalInstances() {
    return this.availableInstances.size + this.occupiedInstances.size;
  }

  constructor(
    readonly source: string,
    private readonly constants: Record<string, unknown>,
    private readonly queueLength: number
  ) {
    logHost(`Initializing instances with queue length of ${queueLength}`);

    this.container.hidden = true;
    this.container.id = 'apManagerContainer';
    document.body.appendChild(this.container);

    for (let i = 0; i < queueLength; i += 1) {
      this.availableInstances.add(
        new ApManagerInstance(source, this.container, constants)
      );
    }
  }

  getInstance = () => {
    const [firstInstance,] = this.availableInstances;
    const rentedInstances = firstInstance
      ?? new ApManagerInstance(this.source, this.container, this.constants);

    this.availableInstances.delete(rentedInstances);
    this.occupiedInstances.add(rentedInstances);

    if (this.availableInstances.size < this.queueLength) {
      for (
        let i = 0;
        i < this.queueLength - this.availableInstances.size;
        i += 1
      ) {
        this.availableInstances.add(
          new ApManagerInstance(this.source, this.container, this.constants)
        );
      }
    }

    logHost(`Getting instance`, firstInstance);

    return rentedInstances;
  }

  destroyInstance = (x: ApManagerInstance) => {
    x.destroy();
    this.availableInstances.delete(x);
    this.occupiedInstances.delete(x);
  }
}

export class ApManager {
  private readonly apManagerMap = new Map<string, ApManagerSource>();

  constructor(private readonly queueLength: number) {
    logHost(`Initializing AP Manager`);
  };

  setupSource = (source: string, constants: Record<string, unknown>) => {
    logHost(`Setting up the source: ${source}`);
    logHost(`Setting up constants:`, constants);
    const newInstance = new ApManagerSource(
      source,
      constants,
      this.queueLength
    );

    this.apManagerMap.set(source, newInstance);

    return newInstance;
  }
}