/* eslint-disable no-await-in-loop */
import {
  AudioClip,
  AudioMixer,
  AudioSource,
  AudioStation,
} from '@recative/audio-station';
import { Track } from '@recative/time-schedule';

import { Clip as PhonographClip } from '@recative/phonograph';
import type { RawAudioClipResponse } from '../utils/selectUrlAudioTypePostProcess';

import { WithLogger } from '../LogCollector';

interface AudioElement {
  play(): void;
  pause(): void;
  isPlaying(): boolean;
  destroy(): void;
  get destroyed(): boolean;
  setVolume(volume: number): void;
  get time(): number;
  set time(value: number);
}

class BasicAudioElement implements AudioElement {
  private clip: AudioClip | null = null;

  private source: AudioSource | null = null;

  constructor(private mixer: AudioMixer, audioClip: AudioClip) {
    this.clip = audioClip;
    this.source = new AudioSource(this.mixer!, this.clip);
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

  destroy() {
    this.source?.destroy();
    this.clip?.destroy();
    this.source = null;
    this.clip = null;
  }

  get destroyed() {
    return this.mixer === null;
  }

  setVolume(volume: number) {
    if (this.mixer !== null) {
      this.mixer.volume = volume;
    }
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

class PhonographAudioElement implements AudioElement {
  private clip: PhonographClip | null = null;

  private suspended = false;

  private playing = false;

  private updateActualPlay = () => {
    if (this.playing && !this.suspended) {
      this.clip?.play();
    } else {
      this.clip?.pause();
    }
  };

  private onMixerSuspend = () => {
    this.suspended = true;
    this.updateActualPlay();
  };

  private onMixerResume = () => {
    this.suspended = false;
    this.updateActualPlay();
  };

  private onMixerDestroy = () => {
    this.destroy();
  };

  constructor(private mixer: AudioMixer, clip: PhonographClip) {
    this.clip = clip;
    clip.connect(mixer.node!);
    this.suspended = mixer.isSuspended();
    mixer.eventTarget.addEventListener('suspend', this.onMixerSuspend);
    mixer.eventTarget.addEventListener('resume', this.onMixerResume);
    mixer.eventTarget.addEventListener('destroy', this.onMixerDestroy);
  }

  play(): void {
    this.clip?.play();
  }

  pause(): void {
    this.clip?.pause();
  }

  isPlaying(): boolean {
    return this.playing;
  }

  destroy(): void {
    this.clip?.disconnect(this.mixer.node!);
    this.mixer.eventTarget.removeEventListener('suspend', this.onMixerSuspend);
    this.mixer.eventTarget.removeEventListener('resume', this.onMixerResume);
    this.mixer.eventTarget.removeEventListener('destroy', this.onMixerDestroy);
    this.clip?.dispose();
    this.clip = null;
  }

  get destroyed(): boolean {
    return this.clip === null;
  }

  setVolume(volume: number): void {
    if (this.clip !== null) {
      this.clip.volume = volume;
    }
  }

  get time(): number {
    if (this.clip !== null) {
      return this.clip.currentTime;
    }
    return 0;
  }

  set time(value: number) {
    if (this.clip !== null) {
      this.clip.currentTime = value;
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
    if (this.pendingBuffer !== null && this.audioElement !== null) {
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
      this.mixer!, audioClipResponse.audioClip,
    );
    this.audioElement.setVolume(this.volume);
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
    this.audioElement?.setVolume(volume);
    this.volume = volume;
  }
}
