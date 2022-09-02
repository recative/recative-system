import type {
  AddAudioRequest,
  TextDialogMessage,
  ImageDialogMessage,
  ResourceDialogMessage,
  AdditionalSubtitleDefine,
  DialogActionTriggerResponse,
} from '@recative/act-protocol';
import type {
  ContentSpec,
  IAssetForClient,
  ManagedCoreState,
  IResourceItemForClient,
  ManagerCoreStateTrigger,
} from '@recative/definitions';
import { ResourceEntry } from '@recative/smart-resource';

import type { EpisodeCore } from './episodeCore';

import type { PreloadManager } from './manager/preload/PreloadManager';
import type { ResourceListForClient } from './manager/resource/ResourceListForClient';

export type CustomEventHandler<T> = (event:CustomEvent<T>)=>void;

export interface EpisodeData {
  resources: IResourceItemForClient[];
  assets: IAssetForClient[];
  preferredUploaders: string[];
  trustedUploaders: string[];
}

export interface InternalEpisodeData {
  resources: ResourceListForClient;
  assets: IAssetForClient[];
  preferredUploaders: string[];
  preloader: PreloadManager;
}

export interface SavedDialogMessageAdditionalData {
  id: string;
}

export type SavedDialogMessageContent =
  | (ImageDialogMessage & SavedDialogMessageAdditionalData)
  | (TextDialogMessage & SavedDialogMessageAdditionalData)
  | (ResourceDialogMessage & SavedDialogMessageAdditionalData);

export interface Progress {
  segment: number;
  progress: number;
}

export interface BGMStateSpec {
  resourceId: string;
}

export interface VideoOverlaySpec {
  resources: ResourceEntry<Record<string, string>>;
}

export interface CoreFunctions {
  // for component independent functions
  core: EpisodeCore;
  // switching blocker
  /** Unblock creating and loading of the new asset instance,
   * aka setup of next content or the preload */
  unblockNextContentSetup(): void
  /** Unblock showing of the new asset instance and hiding of the old asset instance,
   * aka the content switch or the showing */
  unblockContentSwitch(): void;
  // timeline audio
  setAudioTrack(url: string | null): void;
  // interaction audio
  addAudios(specs: AddAudioRequest[]): Promise<void>;
  playAudio(id: string, resetProgress?: boolean): void;
  pauseAudio(id: string): void;
  stopAudio(id: string): void;
  seekAudio(id: string, time?: number): number;
  fadeAudio(
    id: string,
    startVolume: number,
    endVolume: number,
    duration: number
  ): void;
  updateAudioVolume(id: string, volume?: number): number;
  updateAudioLoop(id: string, loop?: boolean): boolean;
  addSubtitleToAudio(subtitles: AdditionalSubtitleDefine[]): void;
  // content lifecycle
  updateContentState(state: ContentState): void;
  finishItself(): void;
  // content timeline sync
  reportProgress(progress: number, time?: number): void;
  reportStuck(time?: number): void;
  reportUnstuck(time?: number): void;
  // managed core state
  setManagedCoreStateTriggers(triggers: ManagerCoreStateTrigger[]): void;
  getManagedCoreState(): Set<ManagedCoreState>;
  addManagedCoreState(state: ManagedCoreState<unknown>): void;
  deleteManagedCoreState(state: ManagedCoreState<unknown>): void;
  clearCoreState(): void;
  // Queued tasks
  requireQueuedTask(id: string, instanceId: string): void;
  // Subsequence control
  createSequence(id: string, assets: IAssetForClient[]): Promise<void>;
  startSequence(id: string): void;
  showSequence(id: string): void;
  hideSequence(id: string): void;
  // logging
  log(...x: unknown[]): void;
}

export type ContentState = 'idle' | 'preloading' | 'ready' | 'destroying' | 'destroyed';

export type CoreState =
  | 'waitingForCriticalComponent'
  | 'waitingForEpisodeData'
  | 'waitingForResource'
  | 'working'
  | 'panic'
  | 'destroying'
  | 'destroyed';

export interface ComponentFunctions {
  // playback and timeline sync
  play(): void;
  pause(): void;
  suspend(): void;
  resume(): void;
  sync(progress: number, time: number): void;
  // content lifecycle, for stage
  createContent(id: string, spec: ContentSpec): void;
  showContent(id: string): void;
  hideContent(id: string): void;
  destroyContent(id: string): void;
  // content lifecycle, for content
  showItself(): void;
  hideItself(): void;
  destroyItself(): Promise<void>;
  // switching blocker
  /** will blocks both preload and showing of next asset instance when it returns true
   * see unblockNextContentSetup and unblockContentSwitch on CoreFunctions */
  shouldBlockContentSwitch(from: number, to: number): boolean;
  // dialog area
  handleDialogActionTrigger(action: DialogActionTriggerResponse): void;
  // run queued task inside the sandbox;
  runQueuedTask(taskId: string): Promise<void>;
  // Subsequence event
  sequenceEnded(id: string): void;
}
