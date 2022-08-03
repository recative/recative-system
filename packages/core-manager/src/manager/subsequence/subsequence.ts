import { AssetForClient } from '@recative/definitions';
import type { InstanceOption } from '../../instance';
import { WithLogger } from '../../LogCollector';
// eslint-disable-next-line import/no-cycle
import { ContentSequence } from '../../sequence';

export class SubsequenceManager extends WithLogger {
  subsequences = new Map<string, ContentSequence>();

  volume = 1;

  playing = false;

  private destroyed = false;

  managedCoreStateDirty = true;

  managedStateEnabled = false;

  constructor(private instanceId: string, private option: InstanceOption) {
    super();

    this.logger = this.option.logger.extend('subsequences');
  }

  play() {
    this.playing = true;
    this.subsequences.forEach((subsequence) => {
      subsequence.parentPlay();
    });
  }

  pause() {
    this.playing = false;
    this.subsequences.forEach((subsequence) => {
      subsequence.parentPause();
    });
  }

  destroy() {
    this.destroyed = true;
    this.pause();
    this.subsequences.forEach((subsequence) => {
      subsequence.destroy();
    });
    this.subsequences.clear();
  }

  async createSequence(id: string, assets: AssetForClient[]) {
    if (this.destroyed) {
      return;
    }
    if (this.subsequences.has(id)) {
      throw new Error(`A subsequence with the id ${id} already exist.`);
    }
    if (assets.length <= 0) {
      throw new Error('A subsequence with zero asset is not acceptable.');
    }
    const subsequence = new ContentSequence({
      id: `${this.instanceId}-subsequence|${id}`,
      logger: this.logger.extend(`subsequence|${id}`),
      showing: false,
      parentPlaying: this.playing,
      audioStation: this.option.audioStation,
      managedCoreStateManager: this.option.managedCoreStateManager,
      volume: this.volume,
      assets,
      taskQueue: this.option.taskQueue,
      contentInstances: this.option.contentInstances,
      showingContentCount: this.option.showingContentCount,
      forEachComponent: this.option.forEachComponent,
      getComponent: this.option.getComponent,
      getContentSwitchBlocker: () => new Set<string>(),
    });
    subsequence.eventTarget.addEventListener('end', () => {
      this.option.getComponent(this.instanceId)?.sequenceEnded?.(id);
    });
    if (this.managedStateEnabled) {
      subsequence.setManagedStateEnabled(true);
    }
    subsequence.switchToFirstContent();
    this.subsequences.set(id, subsequence);
    this.managedCoreStateDirty = true;
    await subsequence.firstAssetInstanceReady;
  }

  startSequence(id: string) {
    const subsequence = this.subsequences.get(id);
    if (subsequence === undefined) {
      throw new Error(`The subsequence with the id ${id} do not exist.`);
    }
    subsequence.play();
  }

  showSequence(id: string) {
    const subsequence = this.subsequences.get(id);
    if (subsequence === undefined) {
      throw new Error(`The subsequence with the id ${id} do not exist.`);
    }
    subsequence.show();
  }

  hideSequence(id: string) {
    const subsequence = this.subsequences.get(id);
    if (subsequence === undefined) {
      throw new Error(`The subsequence with the id ${id} do not exist.`);
    }
    subsequence.hide();
  }

  setVolume(volume: number) {
    this.volume = volume;
    this.subsequences.forEach((subsequence) => {
      subsequence.setVolume(volume);
    });
  }

  updateManagedState() {
    let dirty = this.managedCoreStateDirty;
    this.managedCoreStateDirty = false;
    this.subsequences.forEach((subsequence) => {
      dirty ||= subsequence.updateManagedCoreState();
    });
    return dirty;
  }

  setManagedStateEnabled(enabled: boolean) {
    this.managedStateEnabled = enabled;
    this.subsequences.forEach((subsequence) => {
      subsequence.setManagedStateEnabled(enabled);
    });
  }
}
