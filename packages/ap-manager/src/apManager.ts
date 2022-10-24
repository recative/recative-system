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
    eventTarget.dispatchEvent(new ErrorEvent(code, message, stack, reason));
  }
}

export class ApManagerInstance extends EventTarget {
  readonly iFrame = new HTMLIFrameElement();

  readonly channel: IFramePortHostChannel;

  readonly connector: _AsyncVersionOf<ManagedAp['functions']>;

  private ready = new OpenPromise<HTMLIFrameElement>();

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
      this.ready.resolve(this.iFrame);
    },
  }

  constructor(readonly clientSrc: string) {
    super();

    this.iFrame.src = clientSrc;

    const channel = new IFramePortHostChannel(this.iFrame);

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

  get totalInstances() {
    return this.availableInstances.size + this.occupiedInstances.size;
  }

  constructor(readonly source: string, private readonly queueLength: number) {
    for (let i = 0; i < queueLength; i += 1) {
      this.availableInstances.add(new ApManagerInstance(source));
    }
  }

  getInstance = () => {
    const [firstInstance,] = this.availableInstances;
    const rentedInstances = firstInstance ?? new ApManagerInstance(this.source);

    this.availableInstances.delete(rentedInstances);
    this.occupiedInstances.add(rentedInstances);

    if (this.availableInstances.size < this.queueLength) {
      for (
        let i = 0;
        i < this.queueLength - this.availableInstances.size;
        i += 1
      ) {
        this.availableInstances.add(new ApManagerInstance(this.source));
      }
    }
  }

  destroyInstance = (x: ApManagerInstance) => {
    x.destroy();
    this.availableInstances.delete(x);
    this.occupiedInstances.delete(x);
  }
}

export class ApManager {
  private readonly apManagerMap = new Map<string, ApManagerSource>();

  constructor(private readonly queueLength: number) { };

  setupSource = (source: string) => {
    const newInstance = new ApManagerSource(source, this.queueLength);

    this.apManagerMap.set(source, newInstance);

    return newInstance;
  }
}