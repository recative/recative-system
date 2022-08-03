/* eslint-disable no-await-in-loop */
import {
  AudioClip,
  AudioMixer,
  AudioSource,
  AudioStation,
} from '@recative/audio-station';
import { Track } from '@recative/time-schedule';

import type { RawAudioClipResponse } from '../utils/selectUrlAudioTypePostProcess';

import { WithLogger } from '../LogCollector';

/**
 * Audio track for video component
 */
export class AudioTrack extends WithLogger implements Track {
  private clip: AudioClip | null = null;

  private pendingBuffer: Promise<RawAudioClipResponse | null> | null = null;

  private source: AudioSource | null = null;

  private playing = false;

  private mixer: AudioMixer | null;

  private lastProgress = 0;

  private lastUpdateTime = performance.now();

  private cachedProgress = 0;

  private cachedUpdateTime = performance.now();

  private lastStuck = false;

  constructor(station: AudioStation, private id: string) {
    super();
    this.mixer = new AudioMixer(station);
  }

  suspend() {
    this.updateTime();
    this.mixer?.suspend();
  }

  resume() {
    this.updateTime();
    this.mixer?.resume();
  }

  seek(time: number, progress: number) {
    if (this.destroyed) {
      return;
    }
    this.cachedUpdateTime = time;
    this.cachedProgress = progress;
    const audioTime = performance.now();
    const target = progress + audioTime - time;
    if (this.source !== null) {
      this.source.time = target / 1000;
      this.updateTime(true);
    }
  }

  private updateTime(force: boolean = false) {
    if (this.source === null || this.mixer === null) {
      this.lastUpdateTime = this.cachedUpdateTime;
      this.lastProgress = this.cachedProgress;
      return;
    }
    const time = performance.now();
    if (this.source.isPlaying() && !this.mixer.isSuspended()) {
      if (
        force || this.source.time * 1000 - this.lastProgress > (time - this.lastUpdateTime) * 0.01
      ) {
        this.lastProgress = this.source.time * 1000;
        this.lastUpdateTime = time;
      }
    } else {
      if (force || this.source.time * 1000 - this.lastProgress > 0) {
        this.lastProgress = this.source.time * 1000;
      }
      this.lastUpdateTime = time;
    }
  }

  check() {
    if (this.source !== null) {
      this.updateTime();
      return {
        time: this.lastUpdateTime, progress: this.lastProgress,
      };
    }
    return undefined;
  }

  update(time: number, progress: number): boolean {
    if (this.destroyed) {
      return false;
    }
    // Note: some browser (like iOS safari) will suspend the audioContext without notify you.
    // This is used as a workaround
    if (this.mixer?.station.audioContext?.state !== 'running') {
      this.mixer?.station.audioContext?.resume();
    }
    this.cachedUpdateTime = time;
    this.cachedProgress = progress;
    if (this.source !== null && this.mixer !== null) {
      this.updateTime();
      const now = performance.now();
      const target = progress + now - time;
      const current = this.lastProgress + now - this.lastUpdateTime;
      if (Math.abs(target - current) > 33) {
        this.log(`Audio track ${this.id} resync from ${current} to ${target}`);
        this.source.time = target / 1000;
        this.updateTime(true);
      }
    }
    if (this.pendingBuffer !== null && this.source === null) {
      if (!this.lastStuck) {
        this.log(`Audio track ${this.id} stuck, reason: not loaded`);
      }
      this.lastStuck = true;
      return true;
    }
    if (this.mixer?.station.audioContext?.state === 'suspended') {
      if (!this.lastStuck) {
        this.log(`Audio track ${this.id} stuck, reason: audio station suspended`);
      }
      this.lastStuck = true;
      return true;
    }
    if (this.lastStuck) {
      this.log(`Audio track ${this.id} unstuck`);
    }
    this.lastStuck = false;
    return false;
  }

  play(): void {
    this.updateTime();
    this.playing = true;
    this.source?.play();
  }

  pause(): void {
    this.updateTime();
    this.playing = false;
    this.source?.pause();
  }

  setAudio(audioClipResponsePromise: Promise<RawAudioClipResponse | null> | null) {
    this.source?.destroy();
    this.clip?.destroy();
    this.source = null;
    this.clip = null;
    this.pendingBuffer = audioClipResponsePromise;
    if (this.pendingBuffer !== null) {
      this.loadAudio(this.pendingBuffer);
    }
  }

  private async loadAudio(
    audioClipResponsePromise:
    | RawAudioClipResponse
    | Promise<RawAudioClipResponse | null>,
  ) {
    if (this.destroyed) {
      return;
    }
    const audioClipResponse = await audioClipResponsePromise;

    if (!audioClipResponse) return;
    if (this.pendingBuffer !== audioClipResponsePromise) {
      // setAudio when audio is loading or destroyed
      return;
    }
    this.clip = audioClipResponse.audioClip;
    this.log(`Audio track for ${this.id} loaded`);
    this.source = new AudioSource(this.mixer!, this.clip);
    if (this.playing && !this.mixer?.isSuspended()) {
      this.source.play();
      const now = performance.now();
      this.source.time = (this.cachedProgress + now - this.cachedUpdateTime) / 1000;
    } else {
      this.source.time = (this.cachedProgress) / 1000;
    }
    if (this.playing) {
      this.source.play();
    }
    this.updateTime();
    this.pendingBuffer = null;
  }

  destroy() {
    this.source?.destroy();
    this.clip?.destroy();
    this.mixer?.destroy();
    this.source = null;
    this.clip = null;
    this.mixer = null;
    this.pendingBuffer = null;
  }

  get destroyed() {
    return this.mixer == null;
  }

  setVolume(volume: number) {
    if (this.mixer !== null) {
      this.mixer.volume = volume;
    }
  }
}
