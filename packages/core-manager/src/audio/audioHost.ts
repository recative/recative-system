/* eslint-disable no-await-in-loop */
/* eslint-disable max-classes-per-file */
import {
  AudioClip,
  AudioMixer,
  AudioSource,
  AudioStation,
  getGlobalAudioStation,
} from '@recative/audio-station';
import {
  ManagedCoreStateList,
  ManagedCoreStateManager,
  SUBTITLE_MANAGED_CORE_STATE_EXTENSION_ID,
} from '@recative/definitions';
import { AdditionalSubtitleDefine } from '@recative/act-protocol';

import { WithLogger } from '../LogCollector';
import { convertSRTToStatesWithPrefix } from '../utils/managedCoreState';
import type { RawAudioClipResponse } from '../utils/selectUrlAudioTypePostProcess';

class LoadableAudioSource extends WithLogger {
  private clip: AudioClip | null = null;

  private pendingBuffer:
  | Promise<RawAudioClipResponse | null>
  | null = null;

  private pendingClipLoading: Promise<void> | null = null;

  private source: AudioSource | null = null;

  // For attached subtitle
  states: ManagedCoreStateList = new ManagedCoreStateList();

  working = true;

  constructor(
    private mixer: AudioMixer,
    audioClipResponse: Promise<RawAudioClipResponse | null>,
  ) {
    super();
    if (mixer.destroyed) {
      throw new Error('The associated `AudioHost` is already destroyed');
    }
    this.setAudio(audioClipResponse);
  }

  setAudio(audioClipResponsePromise: Promise<RawAudioClipResponse | null>) {
    this.source?.destroy();
    this.clip?.destroy();
    this.source = null;
    this.clip = null;
    this.pendingBuffer = audioClipResponsePromise;
    if (this.pendingBuffer !== null) {
      this.pendingClipLoading = this.loadAudio(this.pendingBuffer);
    } else {
      this.pendingClipLoading = null;
    }
  }

  waitForLoadFinish() {
    return this.pendingClipLoading ?? Promise.resolve();
  }

  private async loadAudio(
    audioClipResponsePromise: Promise<RawAudioClipResponse | null>,
  ) {
    if (!this.working) {
      return;
    }

    const audioClipResponse = await audioClipResponsePromise;
    if (!audioClipResponse) {
      return;
    }
    if (this.pendingBuffer !== audioClipResponsePromise) {
      // setAudio when audio is loading or destroyed
      return;
    }

    this.clip = audioClipResponse.audioClip;
    this.source = new AudioSource(this.mixer!, this.clip);
    this.pendingClipLoading = null;
  }

  destroy() {
    this.source?.destroy();
    this.clip?.destroy();
    this.source = null;
    this.clip = null;
    this.working = false;
    this.pendingBuffer = null;
    this.pendingClipLoading = null;
  }

  play(resetProgress?: boolean) {
    if (resetProgress) {
      this.stop();
    }
    this.source?.play();
  }

  pause() {
    this.source?.pause();
  }

  stop() {
    this.source?.stop();
  }

  seek(time?: number) {
    if (this.source === null) {
      return 0;
    }
    const result = this.source.time;
    if (time) {
      this.source.time = time;
    }
    return result;
  }

  fade(startVolume: number, endVolume: number, duration: number) {
    this.source?.fade(startVolume, endVolume, duration);
  }

  updateVolume(volume?: number) {
    if (this.source === null) {
      return 0;
    }
    const result = this.source.volume;
    if (volume) {
      this.source.volume = volume;
    }
    return result;
  }

  updateLoop(loop?: boolean) {
    if (this.source === null) {
      return false;
    }
    const result = this.source.loop;
    if (loop) {
      this.source.loop = loop;
    }
    return result;
  }

  isPlaying() {
    return this.source?.isPlaying() ?? false;
  }
}

/**
 * Audio host for interaction component
 */
export class AudioHost extends WithLogger {
  private mixer: AudioMixer | null;

  private sources = new Map<string, LoadableAudioSource>();

  private managedStateEnabled = false;

  constructor(
    station: AudioStation,
    private instanceId: string,
    private managedCoreStateManager: ManagedCoreStateManager,
  ) {
    super();
    this.mixer = new AudioMixer(station);
  }

  destroy() {
    this.mixer?.destroy();
    this.mixer = null;
    this.sources.forEach((source) => {
      this.managedCoreStateManager.removeStateList(source.states);
      source.destroy();
    });
    this.sources.clear();
  }

  addAudio(
    id: string,
    audioClipResponsePromise: Promise<RawAudioClipResponse | null>,
  ): Promise<void> {
    if (this.destroyed) {
      return Promise.reject(new Error('The `AudioHost` is already destroyed'));
    }
    if (!this.sources.has(id)) {
      this.sources.set(id, new LoadableAudioSource(this.mixer!, audioClipResponsePromise));
      this.sources.get(id)!.logger = this.logger.extend(id);
    } else {
      this.sources.get(id)!.setAudio(audioClipResponsePromise);
    }
    return this.sources.get(id)!.waitForLoadFinish()!;
  }

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
        dirty ||= source.states.seek(source.seek() * 1000);
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
        }),
      );
    });
  }

  addSrtSubtitleToAudio(subtitles: { id: string; srt: string }[]) {
    subtitles.forEach((spec) => {
      const source = this.sources.get(spec.id);
      source?.states.updateTriggers(
        convertSRTToStatesWithPrefix(
          spec.srt,
          `${this.instanceId}|subtitle|additional|${spec.id}`,
        ),
      );
    });
  }
}

let globalAudioHost: AudioHost | null = null;
export const getGlobalAudioHost = (): AudioHost => {
  if (globalAudioHost == null) {
    globalAudioHost = new AudioHost(
      getGlobalAudioStation(),
      'global',
      new ManagedCoreStateManager(),
    );
  }
  return globalAudioHost;
};
