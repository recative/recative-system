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

interface AudioElement {
  suspend(): void;
  resume(): void;
  isSuspended(): boolean;
  play(): void;
  pause(): void;
  isPlaying(): boolean;
  get loaded(): boolean;
  destroy(): void;
  get destroyed(): boolean;
  setVolume(volume: number): void;
  get hasAudio(): boolean;
  get time(): number;
  set time(value: number);
}

class BasicAudioElement implements AudioElement {
  private clip: AudioClip | null = null;

  private source: AudioSource | null = null;

  private mixer: AudioMixer | null = null;

  constructor(station: AudioStation, audioClip: AudioClip) {
    this.mixer = new AudioMixer(station);
    this.clip = audioClip;
    this.source = new AudioSource(this.mixer!, this.clip);
  }

  suspend() {
    this.mixer?.suspend();
  }

  resume() {
    this.mixer?.resume();
  }

  isSuspended() {
    return this.mixer?.isSuspended() ?? false;
  }

  play() {
    this.source?.play();
  }

  pause() {
    this.source?.pause();
  }

  isPlaying() {
    return this.source?.isPlaying() ?? false;
  }

  get loaded() {
    return this.source !== null;
  }

  destroy() {
    this.source?.destroy();
    this.clip?.destroy();
    this.mixer?.destroy();
    this.source = null;
    this.clip = null;
    this.mixer = null;
  }

  get destroyed() {
    return this.mixer == null;
  }

  setVolume(volume: number) {
    if (this.mixer !== null) {
      this.mixer.volume = volume;
    }
  }

  get hasAudio() {
    return this.source !== null;
  }

  get time() {
    return this.source?.time ?? 0;
  }

  set time(value) {
    if (this.source !== null) {
      this.source.time = value;
    }
  }
}

/**
 * Audio track for video component
 */
export class AudioTrack extends WithLogger implements Track {
  private audioElement: BasicAudioElement | null = null;

  private pendingBuffer: Promise<RawAudioClipResponse | null> | null = null;

  private playing = false;

  private lastProgress = 0;

  private lastUpdateTime = performance.now();

  private cachedProgress = 0;

  private cachedUpdateTime = performance.now();

  private lastStuck = false;

  constructor(private station: AudioStation, private id: string) {
    super();
  }

  suspend() {
    this.updateTime();
    this.audioElement?.suspend();
  }

  resume() {
    this.updateTime();
    this.audioElement?.resume();
  }

  seek(time: number, progress: number) {
    if (this.destroyed) {
      return;
    }
    this.cachedUpdateTime = time;
    this.cachedProgress = progress;
    const audioTime = performance.now();
    const target = progress + audioTime - time;
    if (this.audioElement !== null) {
      this.audioElement.time = target / 1000;
      this.updateTime(true);
    }
  }

  private updateTime(force: boolean = false) {
    if (this.audioElement === null) {
      this.lastUpdateTime = this.cachedUpdateTime;
      this.lastProgress = this.cachedProgress;
      return;
    }
    const time = performance.now();
    if (this.audioElement.isPlaying() && !this.audioElement.isSuspended()) {
      if (
        force
        || this.audioElement.time * 1000 - this.lastProgress > (time - this.lastUpdateTime) * 0.01
      ) {
        this.lastProgress = this.audioElement.time * 1000;
        this.lastUpdateTime = time;
      }
    } else {
      if (force || this.audioElement.time * 1000 - this.lastProgress > 0) {
        this.lastProgress = this.audioElement.time * 1000;
      }
      this.lastUpdateTime = time;
    }
  }

  check() {
    if (this.audioElement?.hasAudio) {
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
    if (this.station.audioContext?.state !== 'running') {
      this.station.audioContext?.resume();
    }
    this.cachedUpdateTime = time;
    this.cachedProgress = progress;
    if (this.audioElement?.hasAudio) {
      this.updateTime();
      const now = performance.now();
      const target = progress + now - time;
      const current = this.lastProgress + now - this.lastUpdateTime;
      if (Math.abs(target - current) > 33) {
        this.log(`Audio track ${this.id} resync from ${current} to ${target}`);
        this.audioElement.time = target / 1000;
        this.updateTime(true);
      }
    }
    if (this.pendingBuffer !== null && this.audioElement?.hasAudio) {
      if (!this.lastStuck) {
        this.log(`Audio track ${this.id} stuck, reason: not loaded`);
      }
      this.lastStuck = true;
      return true;
    }
    if (this.station.audioContext?.state === 'suspended') {
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
    this.audioElement?.play();
  }

  pause(): void {
    this.updateTime();
    this.playing = false;
    this.audioElement?.pause();
  }

  setAudio(audioClipResponsePromise: Promise<RawAudioClipResponse | null> | null) {
    this.audioElement?.destroy();
    this.audioElement = null;
    this.pendingBuffer = audioClipResponsePromise;
    if (this.pendingBuffer !== null) {
      this.loadAudio(this.pendingBuffer);
    }
  }

  private async loadAudio(
    audioClipResponsePromise: RawAudioClipResponse | Promise<RawAudioClipResponse | null>,
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
    this.audioElement?.destroy();
    this.audioElement = new BasicAudioElement(
      this.station, audioClipResponse.audioClip,
    );
    this.audioElement.setVolume(this.volume);
    this.log(`Audio track for ${this.id} loaded`);
    let targetTime = (this.cachedProgress) / 1000;
    if (this.playing && !this.audioElement?.isSuspended()) {
      this.audioElement.play();
      const now = performance.now();
      targetTime = (this.cachedProgress + now - this.cachedUpdateTime) / 1000;
    }
    if (this.playing) {
      this.audioElement.play();
    }
    this.audioElement.time = targetTime;
    this.updateTime();
    this.pendingBuffer = null;
  }

  destroy() {
    this.audioElement?.destroy();
    this.pendingBuffer = null;
    this.working = false;
  }

  private working = true;

  get destroyed() {
    return !this.working;
  }

  private volume = 1;

  setVolume(volume: number) {
    this.audioElement?.setVolume(volume);
    this.volume = volume;
  }
}
