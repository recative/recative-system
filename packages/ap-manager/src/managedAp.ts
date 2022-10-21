import { AsyncCall, _AsyncVersionOf } from 'async-call-rpc';

import { IFramePortClientChannel } from "@recative/act-protocol";

import { logClient } from './log';

export class ManagedAp {
  readonly channel = new IFramePortClientChannel();

  readonly connector: _AsyncVersionOf<ManagedAp['functions']>;

  readonly functions = {
    loadAp: (firstLevelPath: string, secondLevelPath: string) => {
      this.apImporter(firstLevelPath, secondLevelPath);
    },
  }

  constructor(
    private apImporter: (firstLevelPath: string, secondLevel: string) => void
  ) {
    this.connector = AsyncCall<ManagedAp['functions']>(this.functions, {
      channel: this.channel,
      logger: { log: logClient },
      log: { sendLocalStack: true, type: 'pretty' },
    });


  }
}