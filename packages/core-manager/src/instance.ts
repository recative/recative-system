import {
  Remote,
  Timeline,
  RemoteTrack,
  MonitorTrack,
} from '@recative/time-schedule';
import {
  ManagedCoreStateList,
  ManagedCoreStateManager,
} from '@recative/definitions';
import { AudioStation } from '@recative/audio-station';

import { TimeSlicingQueue } from '@recative/open-promise';
import { WritableAtom } from 'nanostores';
// eslint-disable-next-line import/no-cycle
import { SubsequenceManager } from './manager/subsequence/subsequence';
import { AudioHost } from './audio/audioHost';
import { AudioTrack } from './audio/audioTrack';
import { TaskQueueManager } from './manager/taskQueue/TaskQueueManager';
import { Logger, WithLogger } from './LogCollector';
import { ComponentFunctions, ContentState } from './types';

export interface ProgressReporter {
  reportProgress(progress: number, time?: number): void;
  reportStuck(): void;
  reportUnstuck(): void;
}

export interface InstanceOption {
  audioStation: AudioStation;
  volume: number;
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
 * This should only be used in this package
 */
export class ContentInstance extends WithLogger {
  // states
  state: ContentState = 'idle';

  showing: boolean = false;

  // timeline & video related
  timeline: Timeline;

  remote: Remote;

  progressReporter: ProgressReporter;

  // state on the main timeline
  managedCoreStateList = new ManagedCoreStateList();

  audioTrack: AudioTrack;

  // interaction related
  audioHost: AudioHost;

  taskQueueManager: TaskQueueManager;

  managedStateEnabled = false;

  subsequenceManager: SubsequenceManager;

  constructor(public id: string, private option: InstanceOption) {
    super();

    this.logger = option.logger;
    this.option.managedCoreStateManager.addStateList(this.managedCoreStateList);
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
    this.timeline.addTrack(
      new MonitorTrack(option.onUpdate, option.onStuckChange), -Infinity,
    );
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
  }

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
    if (oldState === 'ready' && newState !== 'destroyed') {
      return false;
    }
    if (oldState === 'destroyed') {
      return false;
    }
    return true;
  }

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
      `Content instance ${this.id} transit from ${this.state} to ${state}`,
    );
    this.state = state;
    if (state === 'preloading') {
      this.timeline.addTrack(new RemoteTrack(this.remote, 100), -1);
    } else if (state === 'destroyed') {
      this.destroy();
    }
    this.option.handleStateChange(state);
  }

  finishItself() {
    this.option.handleFinish();
  }

  updateManagedCoreState() {
    let dirty = this.managedCoreStateList.seek(this.timeline.time);
    dirty ||= this.audioHost.updateManagedState();
    dirty ||= this.subsequenceManager.updateManagedState();
    return dirty;
  }

  setManagedStateEnabled(enabled: boolean) {
    if (this.managedStateEnabled === enabled) {
      return;
    }
    this.managedStateEnabled = enabled;
    if (!this.managedStateEnabled) {
      this.option.managedCoreStateManager.removeStateList(this.managedCoreStateList);
    } else {
      this.option.managedCoreStateManager.addStateList(this.managedCoreStateList);
    }
    this.audioHost.setManagedStateEnabled(enabled);
    this.subsequenceManager.setManagedStateEnabled(enabled);
  }

  setVolume(volume: number) {
    this.audioTrack.setVolume(volume);
    this.audioHost.setVolume(volume);
    this.subsequenceManager.setVolume(volume);
  }

  destroy() {
    this.timeline.pause();
    this.audioTrack.destroy();
    this.audioHost.destroy();
    this.subsequenceManager.destroy();
  }
}
