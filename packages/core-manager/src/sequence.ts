import { AssetForClient, ContentSpec, ManagedCoreStateManager } from '@recative/definitions';
import {
  atom, computed, ReadableAtom, WritableAtom,
} from 'nanostores';
import { nanoid } from 'nanoid';
import {
  allSettled, OpenPromise, OpenPromiseState, TimeSlicingQueue,
} from '@recative/open-promise';
import { AudioStation } from '@recative/audio-station';
import EventTarget from '@ungap/event-target';
import type { ComponentFunctions, Progress } from './types';
// eslint-disable-next-line import/no-cycle
import { ContentInstance } from './instance';
import { distinctAtom, throttledAtom, ThrottledAtomReturnType } from './utils/nanostore';
import { Logger } from './LogCollector';

export interface ContentInfo {
  id: string;
  instance: ContentInstance | null;
  duration: number;
  spec: ContentSpec;
  preloadDisabled: boolean;
  earlyDestroyOnSwitch: boolean;
}

export interface IInitialAssetStatus {
  order?: number;
  time?: number;
}

export interface SequenceOption {
  id: string;
  showing?: boolean;
  parentPlaying?: boolean;
  dependencyLoadedPromise?: Promise<void>;
  logger: Logger;
  audioStation: AudioStation;
  managedCoreStateManager: ManagedCoreStateManager;
  volume: number;
  assets: AssetForClient[];
  taskQueue: TimeSlicingQueue;
  initialAssetStatus?: IInitialAssetStatus;
  contentInstances: Map<string, ContentInstance>;
  showingContentCount: WritableAtom<number>;
  forEachComponent: (func: (component: Partial<ComponentFunctions>, name: string) => void) => void;
  getComponent: (name: string) => Partial<ComponentFunctions> | undefined
  getContentSwitchBlocker: (lastSegment: number, currentSegment: number) => Set<string>
}

/**
 * This should only be used in this package
 */
export class ContentSequence {
  logProgress: Logger;

  logContent: Logger;

  logInstance: Logger;

  eventTarget = new EventTarget();

  /**
   * All contents (or 'assets') available in the episode
   * can be indexed with id
   */
  contents = new Map<string, ContentInfo>();

  /**
   * All contents available in the episode sorted in playback order
   */
  contentList: ContentInfo[] = [];

  managedContentInstance = new Set<ContentInstance>();

  /**
   * If the first asset instance ready.
   */
  firstAssetInstanceReady = new OpenPromise<void>();

  dependencyReady = new OpenPromise<void>();

  lastSegment = -2;

  currentSegment = -1;

  nextSegment = 0;

  nextSegmentStartTime = 0;

  switching = false;

  nextContentSetup = false;

  switchingBlocker = new Set<string>();

  switchingUnblocked :OpenPromise<void> | null = null;

  nextContentSetupBlocker = new Set<string>();

  nextContentSetupUnblocked :OpenPromise<void> | null = null;

  currentContentReady :OpenPromise<void> | null = null;

  selfPlaying = atom(false);

  parentPlaying = atom(true);

  playing = computed([this.selfPlaying, this.parentPlaying], (self, parent) => self && parent);

  stuck = atom(true);

  volume = 1;

  segmentsDuration: number[];

  progress = atom<Progress>({ segment: 0, progress: 0 });

  duration: number;

  preciseTime: ReadableAtom<number>;

  time: ThrottledAtomReturnType<number>;

  firstContentSwitched = false;

  managedCoreStateDirty = true;

  managedStateEnabled = false;

  showing = true;

  private destroyPromise: Promise<void> | null = null;

  constructor(private option: SequenceOption) {
    this.logProgress = option.logger.extend('progress');
    this.logContent = option.logger.extend('content');
    this.logInstance = option.logger.extend('instance');

    this.parentPlaying.set(option.parentPlaying ?? true);

    if (option.dependencyLoadedPromise) {
      option.dependencyLoadedPromise.finally(this.setDependencyReady);
    } else {
      this.setDependencyReady();
    }

    this.showing = option.showing ?? true;

    const contentInfos: ContentInfo[] = option.assets.map((asset) => ({
      ...asset,
      instance: null,
    }));
    contentInfos.forEach((info) => {
      this.contents.set(info.id, info);
    });
    this.contentList = contentInfos;
    this.segmentsDuration = this.contentList.map((info) => info.duration);
    this.duration = this.segmentsDuration
      .filter((duration) => Number.isFinite(duration))
      .reduce((a, b) => a + b, 0); this.preciseTime = distinctAtom(
      computed(
        this.progress,
        (progress) => this.segmentsDuration
          .filter(
            (duration, i) => Number.isFinite(duration) && i < progress.segment,
          )
          .reduce((a, b) => a + b, 0)
            + (Number.isFinite(this.segmentsDuration[progress.segment]) ? progress.progress : 0),
      ),
    );
    this.time = throttledAtom(this.preciseTime);

    this.playing.subscribe((playing) => {
      if (playing) {
        if (!this.switching) {
          this.playCurrentContent();
        }
      } else if (!this.switching) {
        this.time.forceUpdate();
        this.pauseCurrentContent();
      }
    });

    this.nextSegment = option.initialAssetStatus?.order ?? 0;
    this.nextSegmentStartTime = option.initialAssetStatus?.time ?? 0;
  }

  private setDependencyReady = () => {
    try {
      this.dependencyReady.resolve();
      // eslint-disable-next-line no-empty
    } catch { }
  };

  private async internalDestroy() {
    this.logProgress(
      'Sequence start to destroy',
    );
    this.switching = false;
    this.nextContentSetupBlocker.clear();
    this.setDependencyReady();
    this.switchingBlocker.clear();
    this.contents.forEach((content) => {
      if (content.instance !== null) {
        this.hideContent(content);
      }
    });
    await allSettled(Array.from(this.managedContentInstance).map((instance) => instance.destroy()));
    this.contents.clear();
    this.contentList = [];
    this.logProgress(
      'Sequence fully destroyed',
    );
  }

  destroy() {
    if (this.destroyPromise === null) {
      this.destroyPromise = this.internalDestroy();
    }
    return this.destroyPromise;
  }

  private getCurrentInstance() {
    return this.contentList[this.currentSegment]?.instance ?? null;
  }

  private updateStuck() {
    let stuck = this.stuck.get();
    let instance = this.getCurrentInstance();
    if (this.switching && this.nextContentSetupBlocker.size > 0) {
      instance = this.contentList[this.lastSegment]?.instance ?? null;
    }
    if (instance !== undefined && instance !== null) {
      if (instance.state !== 'idle' && instance.state !== 'preloading') {
        stuck = instance.timeline.isStuck();
      } else {
        stuck = true;
      }
    } else {
      stuck = true;
    }
    this.stuck.set(stuck);
  }

  private getCurrentContentProgress() {
    const instance = this.getCurrentInstance();
    if (instance !== undefined && instance !== null) {
      if (instance.state !== 'idle' && instance.state !== 'preloading') {
        return instance.timeline.time;
      }
    }
    return this.nextSegmentStartTime;
  }

  private updateProgress() {
    const progress = {
      segment: this.currentSegment,
      progress: this.getCurrentContentProgress(),
    };
    this.progress.set(progress);
  }

  private createContent(content: ContentInfo) {
    const instanceId = `${this.option.id}|content-${content.id}|${nanoid()}`;
    const instance = new ContentInstance(instanceId, {
      spec: content.spec,
      audioStation: this.option.audioStation,
      managedCoreStateManager: this.option.managedCoreStateManager,
      volume: this.volume,
      onUpdate: () => {
        if (this.contentList[this.currentSegment] === content) {
          this.updateProgress();
        }
      },
      onStuckChange: () => {
        if (this.contentList[this.currentSegment] === content) {
          this.updateStuck();
        }
      },
      forEachComponent: this.option.forEachComponent,
      getComponent: this.option.getComponent,
      handleStateChange: (state) => {
        if (state === 'ready') {
          this.handleAssetInstanceReady(instance);
        }
        if (state === 'destroyed') {
          this.handleAssetInstanceDestroy(instance);
        }
      },
      handleFinish: () => {
        this.handleAssetInstanceFinish(instance);
      },
      logger: this.logInstance.extend(instanceId),
      taskQueue: this.option.taskQueue,
      contentInstances: this.option.contentInstances,
      showingContentCount: this.option.showingContentCount,
    });
    content.instance = instance;
    this.managedContentInstance.add(instance);
    this.logContent(`\`createContent\` ${instance.id}`);
    return content.instance;
  }

  private async destroyContent(content: ContentInfo) {
    const instance = content.instance!;
    if (instance === null) {
      return;
    }
    content.instance = null;
    this.logContent(`\`destroyContent\` ${instance.id}`);
    await instance.destroy();
  }

  private showContent(content: ContentInfo) {
    const { instance } = content;
    if (instance === null) {
      return;
    }
    this.logContent(`\`showContent\` ${instance.id}`);
    if (this.showing) {
      if (this.managedStateEnabled) {
        instance.setManagedStateEnabled(true);
        this.managedCoreStateDirty = true;
      }
      this.option.getComponent(instance.id)!.showItself?.();
      this.option.forEachComponent((component) => {
        component.showContent?.(instance.id);
      });
    }
    if (!instance.showing) {
      instance.showing = true;
      if (this.showing) {
        this.option.showingContentCount.set(this.option.showingContentCount.get() + 1);
        this.logContent(`showing count ${this.option.showingContentCount.get()}`);
      }
    }
  }

  private hideContent(content: ContentInfo) {
    const instance = content.instance!;
    if (instance === null) {
      return;
    }
    this.logContent(`\`hideContent\` ${instance.id}`);
    if (this.showing) {
      if (this.managedStateEnabled) {
        instance.setManagedStateEnabled(false);
        this.managedCoreStateDirty = true;
      }
      this.option.getComponent(instance.id)!.hideItself?.();
      this.option.forEachComponent((component) => {
        component.hideContent?.(instance.id);
      });
    }
    if (instance.showing) {
      instance.showing = false;
      if (this.showing) {
        this.option.showingContentCount.set(this.option.showingContentCount.get() - 1);
        this.logContent(`showing count ${this.option.showingContentCount.get()}`);
      }
    }
  }

  private handleAssetInstanceReady(instance: ContentInstance) {
    if (this.firstAssetInstanceReady.state === OpenPromiseState.Idle) {
      this.firstAssetInstanceReady.resolve();
    }

    const currentContent = this.contentList[this.currentSegment];
    // Since we have a preload machinist, if the asset instance is already shown
    // on the stage, we can try to start this instance immediately, or this
    // ready signal only means the preload process is finished.
    if (currentContent.instance === instance) {
      this.logContent(`Current content ${instance.id} ready`);
      this.currentContentReady?.resolve();
    }
  }

  private handleAssetInstanceFinish(instance: ContentInstance) {
    const currentContent = this.contentList[this.currentSegment];
    if (currentContent.instance === instance) {
      this.logContent(`Current content ${instance.id} finish`);
      this.eventTarget.dispatchEvent(
        new CustomEvent('segmentEnd', { detail: this.currentSegment }),
      );
      this.contentSwitching();
    }
  }

  private handleAssetInstanceDestroy(instance: ContentInstance) {
    this.managedContentInstance.delete(instance);
  }

  private setupContentSwitchBlocker() {
    this.nextContentSetupUnblocked = new OpenPromise();
    this.switchingUnblocked = new OpenPromise();
    const blocker = this.option.getContentSwitchBlocker(this.lastSegment, this.currentSegment);
    blocker.forEach((name) => {
      this.nextContentSetupBlocker.add(name);
      this.switchingBlocker.add(name);
      this.logProgress(`Switching block by ${name}`);
    });
    if (this.nextContentSetupBlocker.size <= 0) {
      this.nextContentSetupUnblocked?.resolve();
    }
    if (this.switchingBlocker.size <= 0) {
      this.switchingUnblocked?.resolve();
    }
  }

  private setupCurrentContentReady() {
    this.currentContentReady = new OpenPromise();
    const content = this.contentList[this.currentSegment];
    if (content?.instance?.state === 'ready') {
      this.currentContentReady.resolve();
    }
  }

  private async contentSwitching() {
    this.ensureNotDestroyed();
    this.pauseCurrentContent();
    this.switching = true;
    this.nextContentSetup = false;
    this.lastSegment = this.currentSegment;
    this.currentSegment = this.nextSegment;
    this.nextSegment = this.currentSegment + 1;
    this.logProgress('Started content switching');

    this.setupContentSwitchBlocker();

    this.logProgress(`New segment ${this.currentSegment}`);
    this.updateProgress();
    this.updateStuck();

    await this.nextContentSetupUnblocked;
    this.nextContentSetupUnblocked = null;
    this.ensureNotDestroyed();

    this.nextContentSetup = true;
    if (this.contentList.length <= this.currentSegment) {
      this.logContent('No more content to play');
      this.eventTarget.dispatchEvent(new CustomEvent('end'));
      return;
    }
    const lastContent = this.contentList[this.lastSegment];
    if (lastContent !== undefined) {
      if (lastContent.earlyDestroyOnSwitch) {
        this.hideContent(lastContent);
        await this.destroyContent(lastContent);
        this.ensureNotDestroyed();
      }
    }
    const content = this.contentList[this.currentSegment];
    if (content.instance === null) {
      this.createContent(content);
    }
    this.setupCurrentContentReady();

    await allSettled([
      this.switchingUnblocked!,
      this.currentContentReady!,
      this.dependencyReady,
    ]);
    this.switchingUnblocked = null;
    this.currentContentReady = null;
    this.ensureNotDestroyed();

    this.showContent(content);
    this.eventTarget.dispatchEvent(
      new CustomEvent('segmentStart', { detail: this.currentSegment }),
    );
    if (lastContent !== undefined) {
      this.hideContent(lastContent);
      // here we do not wait for destroy so the content transit smoothly
      this.destroyContent(lastContent);
    }
    this.logProgress('Finished content switching');
    this.switching = false;
    content.instance!.timeline.time = this.nextSegmentStartTime;
    this.nextSegmentStartTime = 0;
    this.updateProgress();
    this.updateStuck();
    if (this.playing.get()) {
      this.playCurrentContent();
    }
    // TODO: postpone preparing when current content is a video
    const nextContent = this.contentList[this.currentSegment + 1];
    if (nextContent !== undefined) {
      if (!nextContent.preloadDisabled) {
        this.prepareNextContent();
      }
    }
  }

  unblockSwitching(name: string) {
    this.unblockNextContentSetup(name);
    if (this.switchingBlocker.has(name)) {
      this.switchingBlocker.delete(name);
      this.logProgress(`Switching unblock by ${name}`);
      if (this.switchingBlocker.size <= 0) {
        this.switchingUnblocked?.resolve();
      }
    }
  }

  unblockNextContentSetup(name: string) {
    if (this.nextContentSetupBlocker.has(name)) {
      this.nextContentSetupBlocker.delete(name);
      this.logProgress(`Next content setup unblock by ${name}`);
      if (this.nextContentSetupBlocker.size <= 0) {
        this.nextContentSetupUnblocked?.resolve();
      }
    }
  }

  private playCurrentContent() {
    const instance = this.contentList[this.currentSegment]?.instance ?? null;
    if (instance === null) {
      return;
    }
    if (instance.state === 'ready') {
      instance.timeline.play();
      instance.subsequenceManager.play();
    }
  }

  private pauseCurrentContent() {
    const instance = this.contentList[this.currentSegment]?.instance ?? null;
    if (instance === null) {
      return;
    }
    if (instance.state === 'ready') {
      instance.timeline.pause();
      instance.subsequenceManager.pause();
    }
  }

  private prepareNextContent() {
    if (this.currentSegment + 1 < this.contentList.length) {
      const content = this.contentList[this.currentSegment + 1];
      if (content.instance !== null) {
        this.logContent(`Next content ${content.id} was already prepared`);
      } else {
        this.logContent(`Preparing next content ${content.id}`);
        this.createContent(content);
      }
    }
  }

  switchToFirstContent() {
    if (this.firstContentSwitched) {
      this.updateStuck();
      return;
    }
    this.firstContentSwitched = true;
    this.contentSwitching();
  }

  play() {
    this.logProgress('Play');
    this.selfPlaying.set(true);
  }

  pause() {
    this.logProgress('Pause');
    this.selfPlaying.set(false);
  }

  parentPlay() {
    this.logProgress('Parent Play');
    this.parentPlaying.set(true);
  }

  parentPause() {
    this.logProgress('Parent Pause');
    this.parentPlaying.set(false);
  }

  skip() {
    this.seek(this.currentSegment + 1, 0);
  }

  seek(segment: number, time: number) {
    if (this.switching) {
      this.logProgress('Seek when switching content, ignored');
      return;
    }
    if (!this.firstContentSwitched) {
      this.logProgress('Seek before first content switched, ignored');
      return;
    }
    this.logProgress(`Seek to ${time} at segment ${segment}`);
    if (segment === this.currentSegment) {
      this.contentList[this.currentSegment].instance!.timeline.time = time;
    } else {
      this.nextSegment = segment;
      this.nextSegmentStartTime = time;
      this.contentSwitching();
    }
  }

  show() {
    this.showing = true;
    this.contentList.forEach((content) => {
      const { instance } = content;
      if (instance !== null) {
        if (instance.showing) {
          if (this.managedStateEnabled) {
            instance.setManagedStateEnabled(true);
            this.managedCoreStateDirty = true;
          }
          this.option.getComponent(instance.id)!.showItself?.();
          this.option.forEachComponent((component) => {
            component.showContent?.(instance.id);
          });
          this.option.showingContentCount.set(this.option.showingContentCount.get() + 1);
          this.logContent(`showing count ${this.option.showingContentCount.get()}`);
        }
      }
    });
  }

  hide() {
    this.showing = false;
    this.contentList.forEach((content) => {
      const { instance } = content;
      if (instance !== null) {
        if (instance.showing) {
          if (this.managedStateEnabled) {
            instance.setManagedStateEnabled(false);
            this.managedCoreStateDirty = true;
          }
          this.option.getComponent(instance.id)!.hideItself?.();
          this.option.forEachComponent((component) => {
            component.hideContent?.(instance.id);
          });
          this.option.showingContentCount.set(this.option.showingContentCount.get() - 1);
          this.logContent(`showing count ${this.option.showingContentCount.get()}`);
        }
      }
    });
  }

  setVolume(volume: number) {
    this.volume = volume;
    this.contentList.forEach((content) => {
      content.instance?.setVolume(volume);
    });
  }

  updateManagedCoreState() {
    let dirty = this.managedCoreStateDirty;
    this.managedCoreStateDirty = false;
    const instance = this.getCurrentInstance();
    if (instance !== null) {
      dirty ||= instance.updateManagedCoreState();
    }
    return dirty;
  }

  setManagedStateEnabled(enabled: boolean) {
    this.managedStateEnabled = enabled;
    if (this.showing) {
      this.contentList.forEach((content) => {
        const { instance } = content;
        if (instance !== null) {
          if (instance.showing) {
            instance.setManagedStateEnabled(enabled);
            this.managedCoreStateDirty = true;
          }
        }
      });
    }
  }

  private ensureNotDestroyed() {
    if (this.destroyPromise !== null) {
      throw new Error('The sequence was destroyed');
    }
  }
}
