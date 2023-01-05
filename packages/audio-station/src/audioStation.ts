import { AudioContext } from 'standardized-audio-context';
import { AudioClip } from './audioClip';
import type { AudioMixer } from './audioMixer';
import type { CustomEventHandler } from './util';

export type AudioStationEventTarget = EventTarget & {
  addEventListener(
    type: 'reset',
    callback: CustomEventHandler<undefined>
  ): void;
};
/**
 * The audio manager
 */
export class AudioStation {
  private cachedAudioContextOption: AudioContextOptions;

  audioContext: AudioContext | null;

  private lastCheckedAudioContextCurrentTime: number | null = null;

  private lastCheckedAudioContextPerformanceNow: number | null = null;

  private checkAudioContextInterval: ReturnType<typeof setInterval> | null =
    null;

  mixers: Set<AudioMixer>;

  clips: Set<AudioClip>;

  readonly eventTarget = new EventTarget() as AudioStationEventTarget;

  constructor(audioContextOption?: AudioContextOptions) {
    const baseOption: AudioContextOptions = {
      latencyHint: 0.05,
    };
    // webkitAudioContext do not support sampleRate
    if ('AudioContext' in globalThis) {
      baseOption.sampleRate = 48000;
    }
    this.cachedAudioContextOption = {
      ...baseOption,
      ...audioContextOption,
    };
    this.audioContext = new AudioContext(this.cachedAudioContextOption);
    this.audioContext.addEventListener(
      'statechange',
      this.handleAudioContextStateChange
    );
    this.checkAudioContextInterval = setInterval(this.check, 1000);
    this.mixers = new Set();
    this.clips = new Set();
  }

  private handleAudioContextStateChange = () => {
    if (this.audioContext?.state !== 'running') {
      this.resetCheckedTime();
    }
  };

  private resetCheckedTime() {
    this.lastCheckedAudioContextCurrentTime = null;
    this.lastCheckedAudioContextPerformanceNow = null;
  }

  private resumeAudioContext() {
    const { audioContext } = this;
    return (
      audioContext?.resume().catch((err) => {
        if (audioContext === this.audioContext) {
          if (
            (err as Error)?.message.includes('Failed to start the audio device')
          ) {
            // iOS audioContext broken
            this.reset();
          }
        }
        throw err;
      }) ?? Promise.resolve()
    );
  }

  /**
   * Attempt to resume the AudioContext used in the AudioStation
   */
  activate() {
    if (this.destroyed) {
      throw new Error('The audio station was destroyed');
    }
    return this.resumeAudioContext();
  }

  /**
   * Attempt to suspend the AudioContext used in the AudioStation
   */
  deactivate() {
    if (this.destroyed) {
      throw new Error('The audio station was destroyed');
    }
    return this.audioContext!.suspend();
  }

  /**
   * Is the AudioContext used in the AudioStation running
   */
  get activated() {
    return (this.audioContext?.state ?? 'closed') === 'running';
  }

  /**
   * Destroy the AudioContext used in the AudioStation
   */
  destroy() {
    Array.from(this.clips).forEach((clip) => {
      clip.destroy();
    });
    Array.from(this.mixers).forEach((mixer) => {
      mixer.destroy();
    });
    const { audioContext } = this;
    this.audioContext?.removeEventListener(
      'statechange',
      this.handleAudioContextStateChange
    );
    this.audioContext = null;
    this.resetCheckedTime();
    clearInterval(this.checkAudioContextInterval);
    return audioContext?.close() ?? Promise.resolve();
  }

  /**
   * Check if the audio buffer destroyed
   */
  get destroyed() {
    return this.audioContext == null;
  }

  /**
   * Get time from the AudioContext, useful for scheduling
   */
  get time() {
    if (this.destroyed) {
      throw new Error('The audio station was destroyed');
    }
    return this.audioContext!.currentTime;
  }

  /**
   * Reset the audio station when its audio context is broken
   * Designed for iOS, but potentially useful on other platforms
   */
  reset() {
    if (this.destroyed) {
      throw new Error('The audio station was destroyed');
    }
    this.resetCheckedTime();
    this.audioContext?.removeEventListener(
      'statechange',
      this.handleAudioContextStateChange
    );
    this.audioContext?.close();
    const newAudioContext = new AudioContext(this.cachedAudioContextOption);
    this.mixers.forEach((mixer) => {
      mixer.replaceAudioContext(newAudioContext);
    });
    this.audioContext = newAudioContext;
    this.audioContext.addEventListener(
      'statechange',
      this.handleAudioContextStateChange
    );
    this.eventTarget.dispatchEvent(new CustomEvent('reset'));
  }

  /**
   * Check that is the audio context is broken, and reset if it is
   * Designed for iOS, but potentially useful on other platforms
   */
  private check = () => {
    if (this.destroyed) {
      throw new Error('The audio station was destroyed');
    }
    if (this.audioContext?.state === 'closed') {
      this.reset();
      return;
    }
    if (this.audioContext?.state === 'running') {
      const audioContextCurrentTime = this.audioContext!.currentTime;
      const audioContextPerformanceNow = performance.now();
      if (
        this.lastCheckedAudioContextCurrentTime !== null &&
        this.lastCheckedAudioContextPerformanceNow !== null
      ) {
        const audioContextCurrentTimeDiff =
          audioContextCurrentTime - this.lastCheckedAudioContextCurrentTime;
        const audioContextPerformanceNowDiff =
          audioContextPerformanceNow -
          this.lastCheckedAudioContextPerformanceNow;
        if (
          audioContextCurrentTimeDiff <
          audioContextPerformanceNowDiff * 0.01
        ) {
          this.reset();
          return;
        }
      }
      this.lastCheckedAudioContextCurrentTime = audioContextCurrentTime;
      this.lastCheckedAudioContextPerformanceNow = audioContextPerformanceNow;
    }
  };

  /**
   * Load audio buffer from a specific url
   */
  async load(url: string) {
    if (this.destroyed) {
      throw new Error('The audio station was destroyed');
    }
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return this.loadFromBuffer(arrayBuffer);
  }

  async loadFromBuffer(arrayBuffer: ArrayBuffer) {
    if (this.destroyed) {
      throw new Error('The audio station was destroyed');
    }
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    return new AudioClip(this, audioBuffer);
  }
}
