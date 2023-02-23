/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */

import {
  allSettled,
  OpenPromise,
  TimeSlicingQueue,
  OpenPromiseState,
  PromiseResolvedError,
  QueueType,
} from '@recative/open-promise';
import { ResourceLoader } from '@recative/resource-loader';
import { getGlobalAudioStation } from '@recative/audio-station';
import type {
  AddAudioRequest,
  AdditionalSubtitleDefine,
} from '@recative/act-protocol';
import {
  IResourceFileForClient,
  ManagedCoreState,
  ManagedCoreStateManager,
  ManagedCoreStateTriggerEvent,
  PAUSE_CORE_STATE_EXTENSION_ID,
  RawUserImplementedFunctions,
  UserImplementedFunctions,
} from '@recative/definitions';

import { atom, computed } from 'nanostores';
import type { WritableAtom } from 'nanostores';

import EventTarget from '@ungap/event-target';

import { jsonAtom } from './utils/jsonAtom';
import { isNotNullable } from './utils/isNullable';
import { filterBGMState } from './utils/managedCoreState';
import { connect, readonlyAtom } from './utils/nanostore';
import type {
  CoreState,
  EpisodeData,
  ContentState,
  CoreFunctions,
  ComponentFunctions,
  InternalEpisodeData,
  Progress,
  CustomEventHandler,
} from './types';
import { BGMManager } from './audio/bgmManager';
import { LogCollector } from './LogCollector';
import { ContentInstance } from './instance';

import { DialogManager } from './manager/dialog/DialogManager';
import { PreloadManager } from './manager/preload/PreloadManager';
import { ResourceListForClient } from './manager/resource/ResourceListForClient';
import {
  EnvVariableManager,
  DEFAULT_LANGUAGE,
} from './manager/envVariable/EnvVariableManager';
import { ContentSequence, IInitialAssetStatus } from './sequence';

import type { IDefaultAdditionalEnvVariable } from './manager/envVariable/EnvVariableManager';
import {
  AudioElementInit,
  selectUrlAudioElementInitPostProcess,
} from './audio/audioElement';
import { PostProcessCallback } from './utils/tryValidResourceUrl';

export interface EpisodeCoreConfig<T> {
  initialEnvVariable: T;
  initialAssetStatus?: IInitialAssetStatus;
  attemptAutoplay?: boolean;
  defaultContentLanguage?: string;
  defaultSubtitleLanguage?: string;
  episodeId: string;
  externalDependency?: Promise<void>;
}

export type EpisodeCoreEventTarget = EventTarget & {
  addEventListener(
    type: 'segmentStart',
    callback: CustomEventHandler<number>
  ): void;
  addEventListener(
    type: 'segmentEnd',
    callback: CustomEventHandler<number>
  ): void;
  addEventListener(type: 'end', callback: CustomEventHandler<undefined>): void;
};

export class EpisodeCore<
  AdditionalEnvVariable extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable
> {
  private logCollector = new LogCollector('core');

  private logMain = this.logCollector.Logger('main');

  private logComponent = this.logCollector.Logger('component');

  private logAudio = this.logCollector.Logger('audio');

  private logTrigger = this.logCollector.Logger('trigger');

  readonly eventTarget = new EventTarget() as EpisodeCoreEventTarget;

  readonly resourceLoader = ResourceLoader.getInstance();

  readonly audioStation = getGlobalAudioStation();

  readonly fastTaskQueue = new TimeSlicingQueue(
    10,
    QueueType.FrameFilling,
    4,
    undefined,
    'fast'
  );

  readonly slowTaskQueue = new TimeSlicingQueue(
    6,
    QueueType.FrameFilling,
    8,
    this.fastTaskQueue,
    'slow'
  );

  private components = new Map<string, Partial<ComponentFunctions>>();

  private bgmManager: BGMManager;

  /**
   * All current not destroyed contents instance
   */
  private contentInstances = new Map<string, ContentInstance>();

  private criticalComponentReady: OpenPromise<void>;

  private episodeData: OpenPromise<InternalEpisodeData>;

  private userImplementedFunctions: Partial<RawUserImplementedFunctions> | null =
    null;

  // Dialog Related

  public readonly dialogManager: DialogManager;

  // Env Variable Related

  public readonly additionalEnvVariable: WritableAtom<AdditionalEnvVariable>;

  public readonly envVariableManager: EnvVariableManager<AdditionalEnvVariable>;

  /**
   * Is the core initialized
   */
  private ready = false;

  private state = atom<CoreState>('waitingForCriticalComponent');

  readonly coreState = readonlyAtom(this.state);

  private destroyed = false;

  private destroyPromise: Promise<void> | null = null;

  private showingContentCount = atom(0);

  /**
   * If the first asset instance ready.
   */
  readonly firstAssetInstanceReady = new OpenPromise<boolean>();

  readonly stageEmpty = computed(
    this.showingContentCount,
    (count) => count === 0
  );

  private internalAutoplayReady = atom(this.audioStation.activated);

  readonly autoplayReady = readonlyAtom(this.internalAutoplayReady);

  private internalPlaying = atom(false);

  readonly playing = readonlyAtom(this.internalPlaying);

  private internalStuck = atom(true);

  readonly stuck = readonlyAtom(this.internalStuck);

  readonly panicCode = atom<string | null>(null);

  readonly volume = jsonAtom('@recative/core-manager/volume', 1);

  readonly fullScreen = atom(false);

  readonly miniMode = jsonAtom('@recative/core-manager/mini-mode', false);

  readonly resolution = jsonAtom('@recative/core-manager/resolution', {
    width: 1920,
    height: 1080,
  });

  readonly contentLanguage: WritableAtom<string>;

  readonly subtitleLanguage: WritableAtom<string>;

  private mainSequence: ContentSequence | null = null;

  // TODO:Recover this
  private internalSegmentsDuration = atom<number[]>([]);

  readonly segmentsDuration = readonlyAtom<number[]>(
    this.internalSegmentsDuration
  );

  private internalProgress = atom<Progress>({ segment: 0, progress: 0 });

  readonly progress = readonlyAtom(this.internalProgress);

  private internalDuration = atom(0);

  readonly duration = readonlyAtom(this.internalDuration);

  private internalPreciseTime = atom(0);

  readonly preciseTime = readonlyAtom(this.internalPreciseTime);

  private internalTime = atom(0);

  readonly time = readonlyAtom(this.internalTime);

  private internalManagedCoreState = atom(new Set<ManagedCoreState>());

  // merged managed state from all the source of the instance
  private managedCoreStateManager = new ManagedCoreStateManager();

  readonly managedCoreState = readonlyAtom(this.internalManagedCoreState);

  private managedCoreStateDirty = true;

  private nextRafId: number | null = null;

  readonly episodeId: string;

  constructor(config: EpisodeCoreConfig<AdditionalEnvVariable>) {
    // We need to inject this here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).audioStation = this.audioStation;
    this.episodeId = config.episodeId;
    this.contentLanguage = jsonAtom(
      '@recative/core-manager/content-lang',
      config.defaultContentLanguage ?? DEFAULT_LANGUAGE
    );
    this.subtitleLanguage = jsonAtom(
      '@recative/core-manager/subtitle-lang',
      config.defaultSubtitleLanguage ?? DEFAULT_LANGUAGE
    );

    this.managedCoreStateManager.addEventListener(
      'event',
      this.handleManagedCoreState
    );

    this.criticalComponentReady = new OpenPromise();
    this.episodeData = new OpenPromise();
    this.bgmManager = new BGMManager(this.audioStation);
    this.bgmManager.logger = this.logCollector.Logger('bgmManager');
    this.volume.subscribe((volume) => {
      this.bgmManager.setVolume(volume);
      this.mainSequence?.setVolume(volume);
    });
    this.internalManagedCoreState.subscribe((state) => {
      this.bgmManager.setBGMState(
        filterBGMState(state, this.episodeData.resolvedValue)
      );
    });

    this.additionalEnvVariable = atom(config.initialEnvVariable);
    this.envVariableManager = new EnvVariableManager<AdditionalEnvVariable>(
      this.contentLanguage,
      this.additionalEnvVariable
    );

    this.dialogManager = new DialogManager(
      this.components,
      this.episodeData,
      this.ensureNotDestroyed,
      this.envVariableManager.envVariableAtom
    );
    this.fastTaskQueue.run();
    this.slowTaskQueue.run();
    this.init(config);
  }

  initializeEpisode(data: EpisodeData): InternalEpisodeData {
    this.ensureNotDestroyed();

    this.logMain('Episode data received');

    const episodeData: InternalEpisodeData = {
      ...data,
      resources: new ResourceListForClient(
        data.resources,
        data.trustedUploaders ?? [],
        this
      ),
      preloader: new PreloadManager(this),
    };

    try {
      this.episodeData.resolve(episodeData);
    } catch (e) {
      if (e instanceof PromiseResolvedError) {
        throw new Error('The core already has data for the episode');
      } else {
        throw e;
      }
    }
    this.updateState();
    return episodeData;
  }

  getEpisodeData() {
    return this.episodeData.resolvedValue;
  }

  setUserImplementedFunctions(functions: Partial<RawUserImplementedFunctions>) {
    this.ensureNotDestroyed();
    this.userImplementedFunctions = functions;
  }

  getUserImplementedFunctions(): Partial<UserImplementedFunctions> {
    if (this.destroyed) {
      return {};
    }

    if (!this.userImplementedFunctions) {
      throw new TypeError('User implemented functions not set');
    }

    return this.userImplementedFunctions;
  }

  private async launchPreloader() {
    const episodeData = await this.episodeData;
    performance.mark('launchPreloader-start');
    await allSettled([
      episodeData.preloader.cacheAllResourceFileUrl(),
      episodeData.preloader.fetchBlockingResources(),
    ]);
    performance.mark('launchPreloader-end');
    performance.measure(
      'launchPreloader',
      'launchPreloader-start',
      'launchPreloader-end'
    );
    episodeData.preloader.fetchNonBlockingResources();
  }

  private async init(config: EpisodeCoreConfig<AdditionalEnvVariable>) {
    this.audioStation.activate().then(() => {
      this.logAudio('Audio station activated');
      this.internalAutoplayReady.set(true);
    });
    const preload = this.launchPreloader();
    performance.mark('initializeEpisode-start');
    await Promise.all([this.criticalComponentReady, this.episodeData]);
    performance.mark('initializeEpisode-end');
    performance.measure(
      'initializeEpisode',
      'initializeEpisode-start',
      'initializeEpisode-end'
    );
    this.mainSequence = new ContentSequence({
      id: 'main',
      logger: this.logCollector.Logger('mainSequence'),
      dependencyLoadedPromise: allSettled([
        preload,
        Promise.resolve(config.externalDependency),
      ]).then(() => {}),
      audioStation: this.audioStation,
      managedCoreStateManager: this.managedCoreStateManager,
      volume: this.volume.get(),
      assets: this.getEpisodeData()!.assets,
      taskQueue: this.fastTaskQueue,
      initialAssetStatus: config.initialAssetStatus,
      contentInstances: this.contentInstances,
      showingContentCount: this.showingContentCount,
      forEachComponent: (func) => {
        this.components.forEach((component, name) => {
          func(component, name);
        });
      },
      getComponent: (name) => this.components.get(name),
      getContentSwitchBlocker: (lastSegment, currentSegment) => {
        const blocker = new Set<string>();
        this.components.forEach((component, name) => {
          if (
            component.shouldBlockContentSwitch?.(lastSegment, currentSegment) ??
            false
          ) {
            blocker.add(name);
          }
        });
        return blocker;
      },
    });
    this.ready = true;
    this.mainSequence.eventTarget.addEventListener(
      'segmentStart',
      this.forwardEvent
    );
    this.mainSequence.eventTarget.addEventListener(
      'segmentEnd',
      this.forwardEvent
    );
    this.mainSequence.eventTarget.addEventListener('end', this.forwardEvent);
    this.mainSequence.firstAssetInstanceReady.then(() => {
      if (this.firstAssetInstanceReady.state === OpenPromiseState.Idle) {
        this.firstAssetInstanceReady.resolve(true);
      }
    });
    connect(this.mainSequence.playing, this.internalPlaying);
    connect(this.mainSequence.stuck, this.internalStuck);
    this.internalSegmentsDuration.set(this.mainSequence.segmentsDuration);
    connect(this.mainSequence.progress, this.internalProgress);
    this.internalDuration.set(this.mainSequence.duration);
    connect(this.mainSequence.preciseTime, this.internalPreciseTime);
    connect(this.mainSequence.time.atom, this.internalTime);
    this.mainSequence.show();
    // TODO: link sequence atom to core atom to here
    this.updateState();
    this.logMain('Core initialized');
    this.mainSequence.switchToFirstContent();
    this.updateManagedCoreStateLoop();

    if (config.attemptAutoplay ?? true) {
      this.play();
    }
  }

  private forwardEvent = (event: Event) => {
    this.eventTarget.dispatchEvent(new CustomEvent(event.type, event));
  };

  private handleManagedCoreState = (event: Event) => {
    const { trigger } = (event as ManagedCoreStateTriggerEvent).detail;
    this.logTrigger(`ManagedCoreStateEvent`, trigger);
    if (trigger.managedStateExtensionId === PAUSE_CORE_STATE_EXTENSION_ID) {
      // TODO: pause the specific sequence/audio
      this.pause();
      // Make sure the video stop at the specific time
      if (this.mainSequence!.progress.get().progress - trigger.time > 33) {
        this.seek(this.mainSequence!.currentSegment, trigger.time + 1);
      }
    }
  };

  private async internalDestroy() {
    this.logMain('Core start to destroy');
    this.updateState();
    if (
      this.episodeData.state === OpenPromiseState.Idle ||
      this.episodeData.state === OpenPromiseState.Pending
    ) {
      this.episodeData.resolve({
        assets: [],
        resources: new ResourceListForClient([], [], this),
        preferredUploaders: [],
        preloader: new PreloadManager(this),
      });
    }
    if (this.nextRafId !== null) {
      cancelAnimationFrame(this.nextRafId);
      this.nextRafId = null;
    }
    await this.mainSequence?.destroy();
    this.components.clear();
    this.contentInstances.forEach((instance) => {
      instance.releaseResource();
    });
    this.contentInstances.clear();
    this.userImplementedFunctions = null;
    if (
      this.criticalComponentReady.state === OpenPromiseState.Idle ||
      this.criticalComponentReady.state === OpenPromiseState.Pending
    ) {
      this.criticalComponentReady.resolve();
    }

    this.envVariableManager.destroy();
    this.managedCoreStateManager.removeEventListener(
      'event',
      this.handleManagedCoreState
    );
    this.destroyed = true;
    this.updateState();
    this.logMain('Core fully destroyed');
  }

  destroy() {
    if (this.destroyPromise === null) {
      this.destroyPromise = this.internalDestroy();
    }
    this.updateState();
    return this.destroyPromise;
  }

  private ensureNotDestroyed() {
    if (this.destroyed) {
      throw new Error('The core was destroyed');
    }
  }

  private updateState() {
    let state: CoreState = 'waitingForResource';
    if (this.destroyed) {
      state = 'destroyed';
    } else if (this.destroyPromise !== null) {
      state = 'destroying';
    } else if (this.ready) {
      state = 'working';
    } else if (
      this.criticalComponentReady.state !== OpenPromiseState.Fulfilled
    ) {
      state = 'waitingForCriticalComponent';
    } else if (this.episodeData.state === OpenPromiseState.Rejected) {
      state = 'panic';
    } else if (this.episodeData.state !== OpenPromiseState.Fulfilled) {
      state = 'waitingForEpisodeData';
    } else {
      state = 'waitingForResource';
    }
    this.state.set(state);
  }

  private updateManagedCoreState() {
    if (
      this.mainSequence?.updateManagedCoreState() ||
      this.managedCoreStateDirty
    ) {
      const { state } = this.managedCoreStateManager;
      this.internalManagedCoreState.set(state);
    }
    this.managedCoreStateDirty = false;
  }

  private updateManagedCoreStateLoop = () => {
    this.updateManagedCoreState();
    this.nextRafId = requestAnimationFrame(this.updateManagedCoreStateLoop);
  };

  readonly play = () => {
    this.ensureNotDestroyed();
    // TODO: this should in another place
    this.audioStation.activate();
    if (this.state.get() === 'working') {
      this.mainSequence?.play();
    }
  };

  readonly pause = () => {
    this.ensureNotDestroyed();
    if (this.state.get() === 'working') {
      this.mainSequence?.pause();
    }
  };

  readonly skip = () => {
    this.ensureNotDestroyed();
    this.mainSequence?.skip();
  };

  readonly seek = (segment: number, time: number) => {
    this.ensureNotDestroyed();
    this.mainSequence?.seek(segment, time);
  };

  private getFunctionsForComponent(name: string): CoreFunctions {
    const getInstanceFromComponentName = (): ContentInstance => {
      const instance = this.contentInstances.get(name);
      if (instance === undefined) {
        throw new Error('This component is not a content');
      }
      return instance;
    };

    const forwardToInstanceFunctions =
      <
        N extends keyof ContentInstance,
        K extends keyof ContentInstance[N],
        F extends Extract<ContentInstance[N][K], (...args: never[]) => unknown>
      >(
        feature: N,
        key: K
      ) =>
      (...args: Parameters<F>) => {
        this.ensureNotDestroyed();
        const instance = getInstanceFromComponentName();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (instance[feature][key] as any)?.call(
          instance[feature],
          ...args
        ) as ReturnType<F>;
      };

    return {
      core: this,
      get content() {
        return getInstanceFromComponentName();
      },
      unblockNextContentSetup: () => {
        this.ensureNotDestroyed();
        this.mainSequence?.unblockNextContentSetup(name);
      },
      unblockContentSwitch: () => {
        this.ensureNotDestroyed();
        this.mainSequence?.unblockSwitching(name);
      },
      setAudioTrack: (init: Promise<AudioElementInit | null> | null) => {
        this.ensureNotDestroyed();
        const instance = getInstanceFromComponentName();
        this.logAudio(`Instance ${instance.id} \`setAudioTrack\``);
        instance.audioTrack.setAudio(init);
      },
      addAudios: async (requests: AddAudioRequest[]) => {
        this.ensureNotDestroyed();
        const instance = getInstanceFromComponentName();
        const episodeData = this.episodeData.resolvedValue;
        if (!episodeData) {
          throw new Error('No episode data found');
        }

        const addAudioEnv = {
          category: 'audio',
          lang: this.contentLanguage.get(),
        };

        const addAudioWeight = {
          category: 1e4,
          lang: 1,
        };

        const audios = requests.map((x) => ({
          id: x.requestId,
          audioClip:
            'resourceLabel' in x
              ? this.getEpisodeData()!.resources.getResourceByLabel<
                  AudioElementInit,
                  PostProcessCallback<AudioElementInit, IResourceFileForClient>
                >(
                  x.resourceLabel,
                  addAudioEnv,
                  addAudioWeight,
                  selectUrlAudioElementInitPostProcess
                )
              : this.getEpisodeData()!.resources.getResourceById<
                  AudioElementInit,
                  PostProcessCallback<AudioElementInit, IResourceFileForClient>
                >(
                  x.resourceId,
                  addAudioEnv,
                  addAudioWeight,
                  selectUrlAudioElementInitPostProcess
                ),
        }));

        const subtitleEnv = {
          category: 'subtitle',
          lang: this.subtitleLanguage.get(),
        };

        const subtitleWeight = {
          category: 1e4,
          lang: 1,
        };

        const subtitles = requests.map((x) => ({
          id: x.requestId,
          url:
            'resourceLabel' in x
              ? this.getEpisodeData()!.resources.getResourceByLabel(
                  x.resourceLabel,
                  subtitleEnv,
                  subtitleWeight
                )
              : this.getEpisodeData()!.resources.getResourceById(
                  x.resourceId,
                  subtitleEnv,
                  subtitleWeight
                ),
        }));

        this.logAudio('Adding audio files', audios.map((x) => x.id).join(', '));

        await Promise.all(
          audios.map(({ id, audioClip: audioClipPromise }) => {
            if (audioClipPromise !== null) {
              return instance.audioHost.addAudio(id, audioClipPromise);
            }
            return Promise.resolve();
          })
        );

        instance.audioHost.addSrtSubtitleToAudio(
          (
            await Promise.all(
              subtitles.map(async ({ id, url }) => {
                const resultUrl = await url;

                if (resultUrl !== null) {
                  const srt = await (await fetch(resultUrl)).text();
                  return { id, srt };
                }

                return null;
              })
            )
          ).filter(isNotNullable)
        );
      },
      playAudio: forwardToInstanceFunctions('audioHost', 'play'),
      pauseAudio: forwardToInstanceFunctions('audioHost', 'pause'),
      stopAudio: forwardToInstanceFunctions('audioHost', 'stop'),
      seekAudio: forwardToInstanceFunctions('audioHost', 'seek'),
      fadeAudio: forwardToInstanceFunctions('audioHost', 'fade'),
      addSubtitleToAudio: (subtitles: AdditionalSubtitleDefine[]) => {
        forwardToInstanceFunctions(
          'audioHost',
          'addSubtitleToAudio'
        )(subtitles);
        this.managedCoreStateDirty = true;
      },
      updateAudioVolume: forwardToInstanceFunctions(
        'audioHost',
        'updateVolume'
      ),
      updateAudioLoop: forwardToInstanceFunctions('audioHost', 'updateLoop'),
      updateContentState: (state: ContentState) => {
        this.ensureNotDestroyed();
        const instance = getInstanceFromComponentName();
        instance.updateState(state);
      },
      finishItself: () => {
        this.ensureNotDestroyed();
        const instance = getInstanceFromComponentName();
        instance.finishItself();
      },
      reportProgress: forwardToInstanceFunctions(
        'progressReporter',
        'reportProgress'
      ),
      reportStuck: forwardToInstanceFunctions(
        'progressReporter',
        'reportStuck'
      ),
      reportUnstuck: forwardToInstanceFunctions(
        'progressReporter',
        'reportUnstuck'
      ),
      setManagedCoreStateTriggers: (triggers) => {
        getInstanceFromComponentName().additionalManagedCoreStateList.updateTriggers(
          triggers
        );
        this.managedCoreStateDirty = true;
      },
      getManagedCoreState: () =>
        getInstanceFromComponentName().additionalManagedCoreStateList.state,
      addManagedCoreState: (state: ManagedCoreState<unknown>) => {
        getInstanceFromComponentName().additionalManagedCoreStateList.addState(
          state
        );
        this.managedCoreStateDirty = true;
      },
      deleteManagedCoreState: (state: ManagedCoreState<unknown>) => {
        getInstanceFromComponentName().additionalManagedCoreStateList.deleteState(
          state
        );
        this.managedCoreStateDirty = true;
      },
      clearCoreState: () => {
        getInstanceFromComponentName().additionalManagedCoreStateList.clearState();
        this.managedCoreStateDirty = true;
      },
      requireQueuedTask: (taskId: string, instanceId: string) => {
        const instance = this.contentInstances.get(instanceId);
        if (!instance) return;

        instance.taskQueueManager.requireQueuedTask(taskId);
      },
      createSequence: forwardToInstanceFunctions(
        'subsequenceManager',
        'createSequence'
      ),
      startSequence: forwardToInstanceFunctions(
        'subsequenceManager',
        'startSequence'
      ),
      showSequence: forwardToInstanceFunctions(
        'subsequenceManager',
        'showSequence'
      ),
      hideSequence: forwardToInstanceFunctions(
        'subsequenceManager',
        'hideSequence'
      ),
      log: this.logComponent.extend(name),
    };
  }

  registerComponent(
    name: string,
    component: Partial<ComponentFunctions>
  ): CoreFunctions {
    this.ensureNotDestroyed();
    if (this.components.has(name)) {
      this.logComponent(
        `Another component with the name "${name}" have been registered,` +
          ' it will be unregistered to allow the new component to be registered'
      );
      this.unregisterComponent(name);
    }
    this.components.set(name, component);
    this.logComponent(`Component ${name} registered`);

    if (
      this.criticalComponentReady.state === OpenPromiseState.Idle ||
      this.criticalComponentReady.state === OpenPromiseState.Pending
    ) {
      // TODO: more
      if (this.components.has('stage')) {
        this.logMain('Critical component ready');
        this.criticalComponentReady.resolve();
        this.updateState();
      }
    }

    return this.getFunctionsForComponent(name);
  }

  unregisterComponent(name: string) {
    this.ensureNotDestroyed();
    this.components.delete(name);
    this.logComponent(`Component ${name} unregistered`);

    // For instance that unregister before destroy
    const instance = this.contentInstances.get(name);

    if (instance !== undefined) {
      instance.updateState('destroyed');
    }

    // For component that block switching before destroy
    this.mainSequence?.unblockSwitching(name);
  }
}
