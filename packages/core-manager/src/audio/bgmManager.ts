/* eslint-disable max-classes-per-file */
import {
  AudioClip,
  AudioMixer,
  AudioSource,
  AudioStation,
} from '@recative/audio-station';

import type { RawAudioClipResponse } from '../utils/selectUrlAudioTypePostProcess';

import { WithLogger } from '../LogCollector';

export interface BGMSpec {
  id: string;
  audioClipResponse: Promise<RawAudioClipResponse | null>;
}

// Naive implementation
export class BGM extends WithLogger {
  private clip: AudioClip | null = null;

  private source: AudioSource | null = null;

  private working = true;

  private playing = false;

  constructor(
    private mixer: AudioMixer,
    private id: string,
    audioClipResponsePromise: Promise<RawAudioClipResponse | null>
  ) {
    super();

    if (mixer.destroyed) {
      throw new Error('The associated `AudioHost` is already destroyed');
    }
    this.loadBGM(audioClipResponsePromise);
  }

  private async loadBGM(
    audioClipResponsePromise: Promise<RawAudioClipResponse | null>
  ) {
    if (!this.working) {
      return;
    }
    const audioClipResponse = await audioClipResponsePromise;
    if (!this.working || audioClipResponse === null) {
      return;
    }
    this.clip = audioClipResponse.audioClip;
    this.log(`BGM ${this.id} loaded`);
    this.source = new AudioSource(this.mixer!, this.clip);
    this.source.loop = true;
    if (this.playing) {
      this.source.play();
    }
  }

  play() {
    this.playing = true;
    this.source?.play();
  }

  stop() {
    this.playing = false;
    this.source?.stop();
  }

  destroy() {
    this.source?.destroy();
    this.clip?.destroy();
    this.source = null;
    this.clip = null;
    this.working = false;
  }
}

export class BGMManager extends WithLogger {
  private mixer: AudioMixer | null;

  private currentBGMs = new Map<string, BGM>();

  constructor(station: AudioStation) {
    super();
    this.mixer = new AudioMixer(station);
  }

  setBGMState(state: BGMSpec[]) {
    if (this.mixer === null) {
      throw new Error('The associated `BGMManager` is already destroyed');
    }
    const newBGMs = new Map<string, BGM>();
    state.forEach((spec) => {
      if (this.currentBGMs.has(spec.id)) {
        newBGMs.set(spec.id, this.currentBGMs.get(spec.id)!);
        this.currentBGMs.delete(spec.id);
      } else {
        const bgmInstance = new BGM(
          this.mixer!,
          spec.id,
          spec.audioClipResponse
        );
        bgmInstance.logger = this.logger.extend(`bgm(${spec.id})`);
        newBGMs.set(spec.id, bgmInstance);
      }
    });
    this.currentBGMs.forEach((bgm) => {
      bgm.destroy();
    });
    this.currentBGMs = newBGMs;
  }

  destroy() {
    this.mixer?.destroy();
    this.mixer = null;
    this.currentBGMs.forEach((bgm) => {
      bgm.destroy();
    });
    this.currentBGMs.clear();
  }

  setVolume(volume: number) {
    if (this.mixer !== null) {
      this.mixer.volume = volume;
    }
  }
}
