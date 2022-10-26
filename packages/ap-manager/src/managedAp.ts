import { AsyncCall, _AsyncVersionOf } from 'async-call-rpc';

import { IFramePortClientChannel } from "@recative/act-protocol";

import { logClient } from './log';
import type { ApManagerInstance } from './apManager';

export class ManagedAp {
  readonly channel = new IFramePortClientChannel('@recative/ap-manager/message');

  readonly connector: _AsyncVersionOf<ApManagerInstance['functions']>;

  readonly functions = {
    loadAp: (firstLevelPath: string, secondLevelPath: string) => {
      this.apImporter(firstLevelPath, secondLevelPath);
    },
  }

  constructor(
    private apImporter: (firstLevelPath: string, secondLevel: string) => void
  ) {
    logClient(`Initializing Managed AP`);
    this.connector = AsyncCall<ApManagerInstance['functions']>(this.functions, {
      channel: this.channel,
      logger: { log: logClient },
      log: { sendLocalStack: true, type: 'pretty' },
    });
  }
}

