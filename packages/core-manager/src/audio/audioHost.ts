/* eslint-disable no-await-in-loop */
/* eslint-disable max-classes-per-file */
import {
  AudioMixer,
  AudioStation,
  getGlobalAudioStation,
} from '@recative/audio-station';
import {
  ManagedCoreStateList,
  ManagedCoreStateManager,
  SUBTITLE_MANAGED_CORE_STATE_EXTENSION_ID,
  UpdateReason,
} from '@recative/definitions';
import { AdditionalSubtitleDefine } from '@recative/act-protocol';

import { WithLogger } from '../LogCollector';
import { convertSRTToStatesWithPrefix } from '../utils/managedCoreState';
import {
  AudioElement,
  AudioElementInit,
  createAudioElement,
  destroyAudioElementInit,
} from './audioElement';

class LoadableAudioElement extends WithLogger {
  /**
   * Audio element contains decoded audio data.
   */
  private audioElement: AudioElement | null = null;

  /**
   * Audio element definition to be resolved.
   */
  private pendingBuffer: Promise<AudioElementInit | null> | null = null;

  /**
   * The promise for showing if audio clip (decoded audio resource) loaded.
   */
  private pendingClipLoading: Promise<void> | null = null;

  /**
   * State list of this audio element, like subtitle and other custom operations
   */
  states: ManagedCoreStateList = new ManagedCoreStateList();

  /**
   * If the state list is dirty, for resource release purpose.
   */
  cachedManagedStateDirty = false;

  /**
   * If the audio element is not destroyed.
   */
  working = true;

  constructor(
    private mixer: AudioMixer,
    audioClipResponse: Promise<AudioElementInit | null>
  ) {
    super();

    if (mixer.destroyed) {
      throw new Error('The associated `AudioHost` is already destroyed');
    }

    // Load the audio resource
    this.setAudio(audioClipResponse);
  }

  /**
   * Set the audio element definition, contains information about the audio
   * backend and the audio src.
   * @param audioClipResponsePromise A promise contains the definition of the
   * audio.
   */
  setAudio(audioClipResponsePromise: Promise<AudioElementInit | null>) {
    this.audioElement?.destroy();
    this.audioElement = null;
    this.pendingBuffer = audioClipResponsePromise;

    if (this.pendingBuffer !== null) {
      this.pendingClipLoading = this.loadAudio(this.pendingBuffer);
    } else {
      this.pendingClipLoading = null;
    }
  }

  /**
   * Download the audio file and decode the audio.
   * @param audioClipResponsePromise
   * @returns Promise that resolved when the audio is loaded.
   */
  private async loadAudio(
    audioClipResponsePromise: Promise<AudioElementInit | null>
  ) {
    const audioElementInit = await audioClipResponsePromise;
    if (this.pendingBuffer !== audioClipResponsePromise || !this.working) {
      if (audioElementInit) {
        destroyAudioElementInit(audioElementInit);
        // setAudio when audio is loading or destroyed
      }
      return;
    }

    if (audioElementInit !== null) {
      this.audioElement = createAudioElement(this.mixer!, audioElementInit);
    }
    this.pendingClipLoading = null;
  }

  /**
   * Waiting for the audio element to be loaded, if there's no audio loading
   * request happened, the the promise will be resolved instantly.
   */
  waitForLoadFinish() {
    return this.pendingClipLoading ?? Promise.resolve();
  }

  /**
   * Release all resource in the memory.
   */
  destroy() {
    this.audioElement?.destroy();
    this.audioElement = null;
    this.working = false;
    this.pendingBuffer = null;
    this.pendingClipLoading = null;
  }

  play(resetProgress?: boolean) {
    if (resetProgress) {
      this.stop();
    }
    this.audioElement?.play();
  }

  pause() {
    this.audioElement?.pause();
  }

  stop() {
    this.audioElement?.stop();
  }

  get time() {
    if (this.audioElement === null) {
      return 0;
    }

    return this.audioElement.time;
  }

  seek(time?: number) {
    if (time && this.audioElement) {
      this.audioElement.time = time;
      this.cachedManagedStateDirty = this.states.seek(
        this.audioElement.time * 1000,
        UpdateReason.Manually
      );
    }

    return this.time;
  }

  fade(startVolume: number, endVolume: number, duration: number) {
    this.audioElement?.fade(startVolume, endVolume, duration);
  }

  updateVolume(volume?: number) {
    if (this.audioElement === null) {
      return 0;
    }
    const result = this.audioElement.volume;
    if (volume) {
      this.audioElement.volume = volume;
    }
    return result;
  }

  updateLoop(loop?: boolean) {
    if (this.audioElement === null) {
      return false;
    }
    const result = this.audioElement.loop;
    if (loop) {
      this.audioElement.loop = loop;
    }
    return result;
  }

  isPlaying() {
    return this.audioElement?.isPlaying() ?? false;
  }
}

/**
 * Audio host for interaction component
 */
export class AudioHost extends WithLogger {
  private mixer: AudioMixer | null;

  private sources = new Map<string, LoadableAudioElement>();

  private managedStateEnabled = false;

  constructor(
    station: AudioStation,
    private instanceId: string,
    private managedCoreStateManager: ManagedCoreStateManager
  ) {
    super();
    this.mixer = new AudioMixer(station);
  }

  /**
   * Release all loadable audio element and managed core state.
   */
  destroy() {
    this.mixer?.destroy();
    this.mixer = null;
    this.sources.forEach((source) => {
      this.managedCoreStateManager.removeStateList(source.states);
      source.destroy();
    });
    this.sources.clear();
  }

  /**
   * Add audio definition to the host, and trigger the loading process of this
   * element.
   * @param id The id of the request.
   * @param audioClipResponsePromise The detailed spec of the request.
   * @returns
   */
  addAudio(
    id: string,
    audioClipResponsePromise: Promise<AudioElementInit | null>
  ): Promise<void> {
    if (this.destroyed) {
      return Promise.reject(new Error('The `AudioHost` is already destroyed'));
    }

    if (!this.sources.has(id)) {
      this.sources.set(
        id,
        new LoadableAudioElement(this.mixer!, audioClipResponsePromise)
      );
      this.sources.get(id)!.logger = this.logger.extend(id);
    } else {
      this.sources.get(id)!.setAudio(audioClipResponsePromise);
    }
    return this.sources.get(id)!.waitForLoadFinish()!;
  }

  /**
   * Release the memory resource of the single audio element.
   * @param id The id of the element loading request
   */
  destroyAudio(id: string) {
    const source = this.sources.get(id);
    if (source !== undefined) {
      this.managedCoreStateManager.removeStateList(source.states);
      source.destroy();
    }
    this.sources.delete(id);
  }

  hasAudio(id: string) {
    return this.sources.get(id) !== undefined;
  }

  play(id: string, resetProgress?: boolean) {
    this.sources.get(id)?.play(resetProgress);
  }

  pause(id: string) {
    this.sources.get(id)?.pause();
  }

  stop(id: string) {
    this.sources.get(id)?.stop();
  }

  seek(id: string, time?: number) {
    return this.sources.get(id)?.seek(time) ?? 0;
  }

  fade(id: string, startVolume: number, endVolume: number, duration: number) {
    this.sources.get(id)?.fade(startVolume, endVolume, duration);
  }

  updateVolume(id: string, volume?: number) {
    return this.sources.get(id)?.updateVolume(volume) ?? 1;
  }

  updateLoop(id: string, loop?: boolean) {
    return this.sources.get(id)?.updateLoop(loop) ?? false;
  }

  get destroyed() {
    return this.mixer == null;
  }

  setVolume(volume: number) {
    if (this.mixer !== null) {
      this.mixer.volume = volume;
    }
  }

  /**
   * Seek all the managed state based on the time of each source.
   * @returns If the state list is dirty
   */
  updateManagedState() {
    if (!this.managedStateEnabled) {
      return false;
    }
    let dirty = false;
    this.sources.forEach((source) => {
      const playing = source.isPlaying();
      if (
        playing !== this.managedCoreStateManager.stateLists.has(source.states)
      ) {
        dirty = true;
      }
      if (playing) {
        this.managedCoreStateManager.addStateList(source.states);
        dirty ||= source.states.seek(source.time * 1000, UpdateReason.Tick);
        dirty ||= source.cachedManagedStateDirty;
        source.cachedManagedStateDirty = false;
      } else {
        this.managedCoreStateManager.removeStateList(source.states);
      }
    });
    return dirty;
  }

  setManagedStateEnabled(enabled: boolean) {
    if (this.managedStateEnabled === enabled) {
      return;
    }
    this.managedStateEnabled = enabled;
    if (!this.managedStateEnabled) {
      this.sources.forEach((source) => {
        this.managedCoreStateManager.removeStateList(source.states);
      });
    }
  }

  /**
   * Add manually written subtitle.
   * @param subtitles Subtitle configurations.
   */
  addSubtitleToAudio(subtitles: AdditionalSubtitleDefine[]) {
    subtitles.forEach((spec) => {
      const source = this.sources.get(spec.id);
      const subtitleList = spec.subtitles ?? [];
      source?.states.updateTriggers(
        subtitleList.map((subtitle) => {
          return {
            from: subtitle.startTime ?? -Infinity,
            to: subtitle.endTime ?? Infinity,
            id: `${this.instanceId}|subtitle|additional|${spec.id}|${subtitle.id}`,
            managedStateExtensionId: SUBTITLE_MANAGED_CORE_STATE_EXTENSION_ID,
            spec: subtitle.text ?? '',
          };
        })
      );
    });
  }

  /**
   * Add SRT subtitle to audio.
   * @param subtitles Parsed SRT subtitle.
   */
  addSrtSubtitleToAudio(subtitles: { id: string; srt: string }[]) {
    subtitles.forEach((spec) => {
      const source = this.sources.get(spec.id);
      source?.states.updateTriggers(
        convertSRTToStatesWithPrefix(
          spec.srt,
          `${this.instanceId}|subtitle|additional|${spec.id}`
        )
      );
    });
  }
}

let globalAudioHost: AudioHost | null = null;
/**
 * Get the singleton audio host
 */
export const getGlobalAudioHost = (): AudioHost => {
  if (globalAudioHost == null) {
    globalAudioHost = new AudioHost(
      getGlobalAudioStation(),
      'global',
      new ManagedCoreStateManager()
    );
  }
  return globalAudioHost;
};
