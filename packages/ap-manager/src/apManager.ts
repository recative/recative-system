import EventTarget from '@ungap/event-target';

import { AsyncCall, _AsyncVersionOf } from 'async-call-rpc';

import { IFramePortHostChannel } from "@recative/act-protocol";

import { logHost } from './log';

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

export class ApManagerHostInstance extends EventTarget {
  readonly iFrame = new HTMLIFrameElement();

  readonly channel: IFramePortHostChannel;

  readonly connector: _AsyncVersionOf<ApManagerHostInstance['functions']>;

  identity = '';

  readonly functions = {
    apError: ErrorEventDispatcher(this, 'ap'),
    scriptLoadingError: ErrorEventDispatcher(this, 'script-loading'),
    serviceWorkerRegisterError: ErrorEventDispatcher(this, 'sw-register'),
    serviceWorkerRegistered: () => {

    },
    ready: () => {

    },
  }

  constructor(
    readonly clientSrc: string,
    functions: ApManagerHostInstance['functions']
  ) {
    super();

    this.iFrame.src = clientSrc;

    const channel = new IFramePortHostChannel(this.iFrame);

    this.channel = channel;

    this.connector = AsyncCall<ApManagerHostInstance['functions']>(functions, {
      channel,
      logger: { log: logHost },
      log: { sendLocalStack: true, type: 'pretty' },
    });
  }
}

export class ApManager {

}