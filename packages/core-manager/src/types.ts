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
import { AudioElementInit } from './audio/audioElement';

import type { EpisodeCore } from './episodeCore';
import type { ContentInstance } from './instance';

import type { PreloadManager } from './manager/preload/PreloadManager';
import type { ResourceListForClient } from './manager/resource/ResourceListForClient';

export type CustomEventHandler<T> = (event: CustomEvent<T>) => void;

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
  // The content instance
  content: ContentInstance;
  // switching blocker
  /** Unblock creating and loading of the new asset instance,
   * aka setup of next content or the preload */
  unblockNextContentSetup(): void;
  /** Unblock showing of the new asset instance and hiding of the old asset instance,
   * aka the content switch or the showing */
  unblockContentSwitch(): void;
  // timeline audio
  setAudioTrack(init: Promise<AudioElementInit | null> | null): void;
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

export type ContentState =
  | 'idle'
  | 'preloading'
  | 'ready'
  | 'destroying'
  | 'destroyed';

export type CoreState =
  | 'waitingForCriticalComponent'
  | 'waitingForEpisodeData'
  | 'waitingForResource'
  | 'working'
  | 'panic'
  | 'destroying'
  | 'destroyed';

/**
 * An interface defining the functions provided by a component to the content
 * scheduling system (EpisodeCore).
 */
export interface ComponentFunctions {
  /**
   * Begins playback of the component.
   */
  play(): void;

  /**
   * Pauses playback of the component.
   */
  pause(): void;

  /**
   * Suspends playback of the component, but allows resuming without seeking.
   */
  suspend(): void;

  /**
   * Resumes playback of the component from the current position.
   */
  resume(): void;

  /**
   * Syncs the progress and time of the component with the EpisodeCore.
   * @param progress - A number between 0 and 1 representing the progress of the
   *        component.
   * @param time - A number in milliseconds representing the current time of the
   *        component.
   */
  sync(progress: number, time: number): void;

  /**
   * Creates an asset (a piece of content) with the provided ID and
   * specifications.
   * @param id - A string ID for the asset.
   * @param spec - An object specifying the metadata for the asset, including
   *        its type and additional information necessary for displaying it.
   */
  createContent(id: string, spec: ContentSpec): void;

  /**
   * Shows the asset with the provided ID.
   * @param id - The ID of the asset to show.
   */
  showContent(id: string): void;

  /**
   * Hides the asset with the provided ID.
   * @param id - The ID of the asset to hide.
   */
  hideContent(id: string): void;

  /**
   * Destroys the asset with the provided ID.
   * @param id - The ID of the asset to destroy.
   */
  destroyContent(id: string): void;

  /**
   * Shows the component itself.
   */
  showItself(): void;

  /**
   * Hides the component itself.
   */
  hideItself(): void;

  /**
   * Destroys the component itself.
   * @returns A Promise that resolves when the destruction is complete.
   */
  destroyItself(): Promise<void>;

  /**
   * Determines whether content switching should be blocked between the provided
   * indices.
   * @param from - The index of the asset being switched from.
   * @param to - The index of the asset being switched to.
   * @returns A boolean indicating whether content switching should be blocked.
   * @see unblockNextContentSetup
   * @see unblockContentSwitch
   */
  shouldBlockContentSwitch(from: number, to: number): boolean;

  /**
   * Handles a trigger action from a dialog area.
   * @param action - The response object for the triggered action.
   */
  handleDialogActionTrigger(action: DialogActionTriggerResponse): void;

  /**
   * Add a task to the global task scheduling queue.
   * @param taskId - The ID of the task to run.
   * @returns A Promise that resolves when the task is complete.
   */
  runQueuedTask(taskId: string): Promise<void>;

  /**
   * Notifies the component that a sequence has ended.
   * @param id - The ID of the sequence that has ended.
   */
  sequenceEnded(id: string): void;
}
