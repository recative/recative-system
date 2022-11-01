import EventTarget from '@ungap/event-target';

import { AsyncCall, _AsyncVersionOf } from 'async-call-rpc';

import { IFramePortClientChannel } from "@recative/act-protocol";

import { logClient } from './log';
import type { ApManagerInstance } from './apManager';

export interface LoadApRequestEventDetail {
  firstLevelPath: string;
  secondLevelPath: string;
}

export interface LoadApRequestEvent extends CustomEvent<LoadApRequestEventDetail> { }

export class ManagedAp extends EventTarget {

  readonly channel: IFramePortClientChannel;

  readonly connector: _AsyncVersionOf<ApManagerInstance['functions']>;

  readonly functions = {
    loadAp: (firstLevelPath: string, secondLevelPath: string) => {
      logClient(
        `Received load ap request for ${firstLevelPath}/${secondLevelPath}`
      );
      this.dispatchEvent(
        new CustomEvent(
          'load-ap-request',
          {
            detail: {
              firstLevelPath,
              secondLevelPath,
            }
          }
        )
      );
    }
  }

  constructor() {
    super();
    logClient(`Initializing Managed AP`);

    const clientUrl = new URL(window.location.href);
    const channelId = clientUrl.searchParams.get('channelId');

    this.channel = new IFramePortClientChannel(
      `@recative/ap-manager/message/${channelId}`,
      false
    );

    logClient(`Channel ID: ${this.channel.msgId}`);

    this.connector = AsyncCall<ApManagerInstance['functions']>(
      this.functions,
      {
        channel: this.channel,
        logger: { log: logClient },
        log: { sendLocalStack: true, type: 'pretty' },
      }
    );
  }
}

