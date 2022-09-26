/* eslint-disable no-await-in-loop */
import {
  AudioMixer,
  AudioStation,
} from '@recative/audio-station';
import { Track } from '@recative/time-schedule';

import { WithLogger } from '../LogCollector';
import {
  AudioElement, AudioElementInit, createAudioElement, destroyAudioElementInit,
} from './audioElement';

/**
 * Audio track for video component
 */
export class AudioTrack extends WithLogger implements Track {
  private audioElement: AudioElement | null = null;

  private pendingBuffer: Promise<AudioElementInit | null> | null = null;

  private playing = false;

  private lastProgress = 0;

  private lastUpdateTime = performance.now();

  private cachedProgress = 0;

  private cachedUpdateTime = performance.now();

  private lastStuck = false;

  private mixer: AudioMixer | null = null;

  constructor(private station: AudioStation, private id: string) {
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
    if (this.audioElement.isPlaying() && !this.mixer?.isSuspended()) {
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
    if (this.audioElement !== null) {
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
    if (this.audioElement !== null) {
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
    if (this.pendingBuffer !== null && this.audioElement === null) {
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
    if (this.audioElement?.stuck ?? false) {
      if (!this.lastStuck) {
        this.log(`Audio track ${this.id} stuck, reason: audio element stuck`);
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

  setAudio(audioClipResponsePromise: Promise<AudioElementInit | null> | null) {
    this.audioElement?.destroy();
    this.audioElement = null;
    this.pendingBuffer = audioClipResponsePromise;
    if (this.pendingBuffer !== null) {
      this.loadAudio(this.pendingBuffer);
    }
  }

  private async loadAudio(
    audioClipResponsePromise: Promise<AudioElementInit | null>,
  ) {
    if (this.destroyed) {
      return;
    }
    const audioElementInit = await audioClipResponsePromise;

    if (!audioElementInit) return;
    if (this.pendingBuffer !== audioClipResponsePromise) {
      destroyAudioElementInit(audioElementInit);
      // setAudio when audio is loading or destroyed
      return;
    }
    this.audioElement?.destroy();
    this.audioElement = createAudioElement(this.mixer!, audioElementInit);
    this.audioElement.volume = this.volume;
    this.log(`Audio track for ${this.id} loaded`);
    let targetTime = (this.cachedProgress) / 1000;
    if (this.playing && !this.mixer?.isSuspended()) {
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
    this.mixer?.destroy();
    this.mixer = null;
    this.pendingBuffer = null;
    this.working = false;
  }

  private working = true;

  get destroyed() {
    return !this.working;
  }

  private volume = 1;

  setVolume(volume: number) {
    if (this.audioElement !== null) {
      this.audioElement.volume = volume;
    }
    this.volume = volume;
  }
}
