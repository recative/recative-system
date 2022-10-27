import {
  Remote,
  Timeline,
  RemoteTrack,
  MonitorTrack,
} from '@recative/time-schedule';
import {
  ContentSpec,
  ManagedCoreStateList,
  ManagedCoreStateManager,
  ManagerCoreStateTrigger,
  UpdateReason,
} from '@recative/definitions';
import { AudioStation } from '@recative/audio-station';

import { OpenPromise, TimeSlicingQueue } from '@recative/open-promise';
import { WritableAtom } from 'nanostores';
// eslint-disable-next-line import/no-cycle
import { SubsequenceManager } from './manager/subsequence/subsequence';
import { AudioHost } from './audio/audioHost';
import { AudioTrack } from './audio/audioTrack';
import { TaskQueueManager } from './manager/taskQueue/TaskQueueManager';
import { Logger, WithLogger } from './LogCollector';
import type { ComponentFunctions, ContentState } from './types';

export interface ProgressReporter {
  reportProgress(progress: number, time?: number): void;
  reportStuck(): void;
  reportUnstuck(): void;
}

export interface InstanceOption {
  spec: ContentSpec;
  triggers?: ManagerCoreStateTrigger[];
  audioStation: AudioStation;
  volume: number;
  parentShowing: boolean;
  taskQueue: TimeSlicingQueue;
  managedCoreStateManager: ManagedCoreStateManager;
  contentInstances: Map<string, ContentInstance>;
  showingContentCount: WritableAtom<number>;
  forEachComponent: (func: (component: Partial<ComponentFunctions>, name: string) => void) => void;
  getComponent: (name: string) => Partial<ComponentFunctions> | undefined
  onUpdate: (time: number, progress: number) => void;
  onStuckChange: (stuck: boolean) => void;
  handleStateChange: (state: ContentState) => void;
  handleFinish: () => void;
  logger: Logger;
}

/**
 * An Instance of the Content
 * This should only be used in this package
 */
export class ContentInstance extends WithLogger {
  /**
   * Lifecycle state of ContentInstance
   */
  state: ContentState = 'idle';

  /**
   * Is the ContentInstance itself showing
   */
  selfShowing = false;

  /**
   * Is the parent of the ContentInstance showing
   */
  parentShowing = false;

  /**
   * Is the ContentInstance actual showing, when it is showing itself and parent is also showing
   */
  showing = false

  /**
   * Timeline, for scheduling and synchronization
   */
  timeline: Timeline;

  /**
   * A handle of the timeline related function of component
   */
  remote: Remote;

  /**
   * A channel for the component to report progress
   */
  progressReporter: ProgressReporter;

  // state on the main timeline
  managedCoreStateList = new ManagedCoreStateList();

  additionalManagedCoreStateList = new ManagedCoreStateList();

  managedCoreStateDirty = true;

  audioTrack: AudioTrack;

  managedStateEnabled = false;

  /**
   * Collection of audio sources that can be directly controlled from component
   */
  audioHost: AudioHost;

  /**
   * Collection of Sequences that that can be directly controlled from component
   */
  subsequenceManager: SubsequenceManager;

  taskQueueManager: TaskQueueManager;

  private destroyPromise: Promise<void> | null = null;

  private enterDestroyedState = new OpenPromise<void>();

  constructor(public id: string, private option: InstanceOption) {
    super();

    this.parentShowing = option.parentShowing
    this.logger = option.logger;
    this.managedCoreStateList.updateTriggers(option.triggers ?? [])
    this.timeline = new Timeline();
    this.taskQueueManager = new TaskQueueManager(this, option);
    const remote = {
      progress: 0,
      updateTime: performance.now(),
      stuck: false,
      sync: (time: number, progress: number) => {
        const diff = (progress - time + remote.updateTime) - remote.progress;
        this.log(`Video not sync! Sync to ${progress}(at${time}) from ${remote.progress}(at${remote.updateTime}), diff=${diff}`);
        remote.updateTime = time;
        remote.progress = progress;
        option.getComponent(id)?.sync?.(progress, time);
      },
      play: () => {
        remote.updateTime = performance.now();
        option.getComponent(id)?.play?.();
      },
      pause: () => {
        option.getComponent(id)?.pause?.();
      },
      suspend: () => {
        option.getComponent(id)?.suspend?.();
      },
      resume: () => {
        option.getComponent(id)?.resume?.();
      },
    };
    this.remote = remote;
    // Since the RemoteTrack initialization requires the component,
    // we delay addition of remote track at component preload
    this.timeline.addTrack(new MonitorTrack(option.onUpdate, option.onStuckChange), -Infinity);
    this.audioTrack = new AudioTrack(option.audioStation, id);
    this.audioTrack.logger = this.logger?.extend(`audioTrack(${id})`) || null;
    this.audioTrack.setVolume(option.volume);
    this.timeline.addTrack(this.audioTrack, 1);
    this.progressReporter = {
      reportProgress: (progress: number, time: number = performance.now()) => {
        this.log(`\`reportProgress\` ${progress}`);
        remote.updateTime = time;
        remote.progress = progress;
      },
      reportStuck: (time: number = performance.now()) => {
        if (!remote.stuck) {
          this.log('`reportStuck`');
          remote.updateTime = time;
          remote.stuck = true;
        }
      },
      reportUnstuck: (time: number = performance.now()) => {
        if (remote.stuck) {
          this.log('`reportUnstuck`');
          remote.updateTime = time;
          remote.stuck = false;
        }
      },
    };
    this.audioHost = new AudioHost(
      option.audioStation,
      this.id,
      this.option.managedCoreStateManager,
    );
    this.audioHost.setVolume(option.volume);
    this.audioHost.logger = this.logger.extend('audioHost');
    this.subsequenceManager = new SubsequenceManager(this.id, option);
    this.subsequenceManager.setVolume(option.volume);
    this.option.contentInstances.set(this.id, this);
    this.option.forEachComponent((component) => {
      component.createContent?.(this.id, option.spec);
    });
  }

  /**
   * Check state transition
   * Validate state changes are:
   * - idle -> preloading -> ready
   * - any state above to destroying
   * - any state above to destroyed
   */
  private static validateContentStateChange(
    oldState: ContentState,
    newState: ContentState,
  ): boolean {
    if (oldState === newState) {
      return true;
    }
    if (oldState === 'idle' && newState === 'destroyed') {
      return true;
    }
    if (oldState === 'idle' && newState !== 'preloading') {
      return false;
    }
    if (oldState !== 'destroyed' && newState === 'destroyed') {
      return true;
    }
    if (oldState === 'preloading' && newState !== 'ready') {
      return false;
    }
    if (oldState === 'ready' && newState !== 'destroying' && newState !== 'destroyed') {
      return false;
    }
    if (oldState === 'destroying' && newState !== 'destroyed') {
      return false;
    }
    if (oldState === 'destroyed') {
      return false;
    }
    return true;
  }

  /**
   * Update State
   * TODO: cleanup state transition method
   */
  updateState(state: ContentState) {
    if (this.state === state) {
      return;
    }
    if (!ContentInstance.validateContentStateChange(this.state, state)) {
      throw new Error(
        `Invalid content state transition from ${this.state} to ${state}`,
      );
    }
    this.log(
      `Content instance transit from ${this.state} to ${state}`,
    );
    this.state = state;
    if (state === 'preloading') {
      this.timeline.addTrack(new RemoteTrack(this.remote, 100), -1);
    } else if (state === 'destroying') {
      this.destroy();
    } else if (state === 'destroyed') {
      this.destroy();
      this.option.contentInstances.delete(this.id);
      this.enterDestroyedState.resolve();
    }
    this.option.handleStateChange(state);
  }

  /**
   * Finish the ContentInstance
   */
  finishItself() {
    this.option.handleFinish();
  }

  playIfReady() {
    if (this.state === 'ready') {
      this.timeline.play();
      this.subsequenceManager.play();
    }
  }

  pauseIfReady() {
    if (this.state === 'ready') {
      this.timeline.pause();
      this.subsequenceManager.pause();
    }
  }

  updateShowing() {
    const showing = this.selfShowing && this.parentShowing
    if (this.showing === showing) {
      return
    }
    this.setManagedStateEnabled(showing)
    this.managedCoreStateDirty = true;
    if (showing) {
      this.option.getComponent(this.id)!.showItself?.();
      this.option.forEachComponent((component) => {
        component.showContent?.(this.id);
      });
      this.subsequenceManager.show();
      this.option.showingContentCount.set(
        this.option.showingContentCount.get() + 1,
      );
      this.log(`\`showingContentCount\` increase to ${this.option.showingContentCount.get()}`);
    } else {
      this.option.getComponent(this.id)!.hideItself?.();
      this.option.forEachComponent((component) => {
        component.hideContent?.(this.id);
      });
      this.subsequenceManager.hide();
      this.option.showingContentCount.set(
        this.option.showingContentCount.get() - 1,
      );
      this.log(`\`showingContentCount\` decease to ${this.option.showingContentCount.get()}`);
    }
    this.showing = showing;
  }

  show() {
    this.selfShowing = true
    this.updateShowing()
  }

  hide() {
    this.selfShowing = false
    this.updateShowing()
  }

  parentShow() {
    this.parentShowing = true
    this.updateShowing()
  }

  parentHide() {
    this.parentShowing = false
    this.updateShowing()
  }

  updateManagedCoreState() {
    let dirty = this.managedCoreStateList.seek(this.timeline.time, UpdateReason.Tick);
    dirty ||= this.additionalManagedCoreStateList.seek(this.timeline.time, UpdateReason.Tick);
    dirty ||= this.audioHost.updateManagedState();
    dirty ||= this.subsequenceManager.updateManagedState();
    dirty ||= this.managedCoreStateDirty
    this.managedCoreStateDirty = false;
    return dirty;
  }

  setManagedStateEnabled(enabled: boolean) {
    if (this.managedStateEnabled === enabled) {
      return;
    }
    this.managedStateEnabled = enabled;
    if (!this.managedStateEnabled) {
      this.option.managedCoreStateManager.removeStateList(this.managedCoreStateList);
      this.option.managedCoreStateManager.removeStateList(this.additionalManagedCoreStateList);
    } else {
      this.option.managedCoreStateManager.addStateList(this.managedCoreStateList);
      this.option.managedCoreStateManager.addStateList(this.additionalManagedCoreStateList);
    }
    this.audioHost.setManagedStateEnabled(enabled);
  }

  setVolume(volume: number) {
    this.audioTrack.setVolume(volume);
    this.audioHost.setVolume(volume);
    this.subsequenceManager.setVolume(volume);
  }

  async releaseResource() {
    this.timeline.pause();
    this.audioTrack.destroy();
    this.audioHost.destroy();
    await this.subsequenceManager.destroy();
  }

  setTime(time: number) {
    this.timeline.time = time
    this.managedCoreStateDirty ||= this.managedCoreStateList.seek(time, UpdateReason.Manually)
    this.managedCoreStateDirty ||= this.additionalManagedCoreStateList.seek(time, UpdateReason.Manually)
  }

  private async internalDestroy() {
    this.log(
      'Content instance start to destroy',
    );
    await this.option.getComponent(this.id)!.destroyItself?.()?.finally(() => { });
    this.option.forEachComponent((component) => {
      component.destroyContent?.(this.id);
    });
    await this.enterDestroyedState;
    await this.releaseResource();
    this.log(
      'Content instance fully destroyed',
    );
  }

  destroy() {
    if (this.destroyPromise === null) {
      this.destroyPromise = this.internalDestroy();
    }
    return this.destroyPromise;
  }
}
