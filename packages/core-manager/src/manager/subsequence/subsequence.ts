import { IAssetForClient } from '@recative/definitions';
import { allSettled } from '@recative/open-promise';
import type { InstanceOption } from '../../instance';
import { WithLogger } from '../../LogCollector';
// eslint-disable-next-line import/no-cycle
import { ContentSequence } from '../../sequence';

/**
 * Collection of Sequences that that can be directly controlled from component
 * TODO: Add more methods to control Subsequence (when we need)
 */
export class SubsequenceManager extends WithLogger {
  subsequences = new Map<string, ContentSequence>();

  volume = 1;

  playing = false;

  showing = false;

  private destroyed = false;

  managedCoreStateDirty = true;

  managedStateEnabled = false;

  private destroyPromise: Promise<void> | null = null;

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

  show() {
    this.showing = true;
    this.subsequences.forEach((subsequence) => {
      subsequence.parentShow();
    });
  }

  hide() {
    this.showing = false;
    this.subsequences.forEach((subsequence) => {
      subsequence.parentHide();
    });
  }

  private async internalDestroy() {
    this.destroyed = true;
    this.pause();
    await allSettled(
      Array.from(this.subsequences.values()).map((subsequence) =>
        subsequence.destroy()
      )
    );
    this.subsequences.clear();
  }

  destroy() {
    if (this.destroyPromise === null) {
      this.destroyPromise = this.internalDestroy();
    }
    return this.destroyPromise;
  }

  /**
   * Create a subsequence from list of assets
   */
  async createSequence(id: string, assets: IAssetForClient[]) {
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
      parentShowing: false,
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
    subsequence.switchToFirstContent();
    this.subsequences.set(id, subsequence);
    this.managedCoreStateDirty = true;
    await subsequence.firstAssetInstanceReady;
  }

  /**
   * Start playing a subsequence
   */
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
}
