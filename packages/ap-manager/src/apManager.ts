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

  private readonly channelA: IFramePortHostChannel;

  private channelB: IFramePortHostChannel | undefined;

  protected connector: _AsyncVersionOf<ManagedAp['functions']>;

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
    getConstants: () => this.source.constants,
  }

  randomId: string;

  constructor(
    public readonly source: ApManagerSource,
  ) {
    super();

    logHost(
      'Initializing ApManagerInstance with src:',
      this.source.source,
      'frame:',
      this.iFrame
    );

    this.randomId = Math.random().toString(36).replace('0.', 'c-');

    const iFrameUrl = new URL(this.source.source, window.location.href);
    iFrameUrl.searchParams.set('channelId', this.randomId);

    this.iFrame.src = iFrameUrl.toString();
    this.iFrame.title = 'Interactive Content';
    source.container.append(this.iFrame);

    const channelA = new IFramePortHostChannel(
      this.iFrame,
      new URL(this.source.source, window.location.href).origin,
      `@recative/ap-manager/message/${this.randomId}-A`,
      false
    );

    this.channelA = channelA;

    this.connector = AsyncCall<ManagedAp['functions']>(
      this.functions,
      {
        channel: channelA,
        logger: { log: logHost },
        log: { sendLocalStack: true, type: 'pretty' },
      }
    );
  }

  loadAp = (firstLevelPath: string, secondLevelPath: string) => {
    const channelB = new IFramePortHostChannel(
      this.iFrame,
      new URL(this.source.source, window.location.href).origin,
      `@recative/ap-manager/message/${this.randomId}-B`,
      false
    );

    this.channelB = channelB;

    this.connector = AsyncCall<ManagedAp['functions']>(
      this.functions,
      {
        channel: channelB,
        logger: { log: logHost },
        log: { sendLocalStack: true, type: 'pretty' },
      }
    );

    this.connector.loadAp(firstLevelPath, secondLevelPath);
  }

  destroy = () => {
    logHost('Destroying the act point instance');
    this.iFrame.src = 'about:blank';
    this.iFrame.remove();
    this.channelA.destroy();
    this.channelB?.destroy();
  }
}

const ELEMENT_ID = 'apManagerContainer';

export class ApManagerSource {
  private availableInstances = new Set<ApManagerInstance>();

  private occupiedInstances = new Set<ApManagerInstance>();

  readonly container =
    document.getElementById(ELEMENT_ID) as HTMLDivElement
    ?? document.createElement('div');

  get totalInstances() {
    return this.availableInstances.size + this.occupiedInstances.size;
  }

  constructor(
    readonly source: string,
    readonly constants: Record<string, unknown>,
    readonly queueLength: number
  ) {
    logHost(`Initializing instances with queue length of ${queueLength}`);

    if (this.container.id !== ELEMENT_ID) {
      this.container.style.width = '0';
      this.container.style.height = '0';
      this.container.style.overflow = 'hidden';
      this.container.id = ELEMENT_ID;
      document.body.appendChild(this.container);
    }

    this.ensureInstanceCount();
  }

  getInstance = () => {
    const [firstInstance,] = this.availableInstances;
    const rentedInstances = firstInstance
      ?? new ApManagerInstance(this);

    this.availableInstances.delete(rentedInstances);
    this.occupiedInstances.add(rentedInstances);

    logHost(`Getting instance`, firstInstance);

    return rentedInstances;
  }

  ensureInstanceCount = () => {
    if (this.availableInstances.size < this.queueLength) {
      for (
        let i = 0;
        i < this.queueLength - this.availableInstances.size;
        i += 1
      ) {
        this.availableInstances.add(
          new ApManagerInstance(this)
        );
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

  constructor(private readonly queueLength: number) {
    logHost(`Initializing AP Manager`);
  };

  setupSource = (source: string, constants: Record<string, unknown>) => {
    logHost(`Setting up the source: ${source}`);
    logHost(`Setting up constants:`, constants);

    const result = this.apManagerMap.get(source);

    if (result) return result;

    const newInstance = new ApManagerSource(
      source,
      constants,
      this.queueLength
    );

    this.apManagerMap.set(source, newInstance);

    return newInstance;
  }
}