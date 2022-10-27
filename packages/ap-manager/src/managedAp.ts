import { AsyncCall, _AsyncVersionOf } from 'async-call-rpc';

import { IFramePortClientChannel } from "@recative/act-protocol";

import { logClient } from './log';
import type { ApManagerInstance } from './apManager';

export class ManagedAp {

  readonly channel: IFramePortClientChannel;

  readonly connector: _AsyncVersionOf<ApManagerInstance['functions']>;

  readonly functions = {
    loadAp: (firstLevelPath: string, secondLevelPath: string) => {
      logClient(
        `Received load ap request for ${firstLevelPath}/${secondLevelPath}`
      );
      this.apImporter(firstLevelPath, secondLevelPath);
    },
    ping: () => {
      logClient(`ping`);
      return 'pong';
    }
  }

  constructor(
    private apImporter: (firstLevelPath: string, secondLevel: string) => void
  ) {
    logClient(`Initializing Managed AP`);

    const clientUrl = new URL(window.location.href);
    const channelId = clientUrl.searchParams.get('channelId');

    this.channel = new IFramePortClientChannel(
      `@recative/ap-manager/message/${channelId}`
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

