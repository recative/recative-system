import { AudioContext } from 'standardized-audio-context';
import { AudioClip } from './audioClip';
import type { AudioMixer } from './audioMixer';

/**
 * The audio manager
 */
export class AudioStation {
  private cachedAudioContext: AudioContextOptions;

  audioContext: AudioContext | null;

  mixers: Set<AudioMixer>;

  clips: Set<AudioClip>;

  constructor(audioContextOption?: AudioContextOptions) {
    const baseOption: AudioContextOptions = {
      latencyHint: 0.05,
    };
    // webkitAudioContext do not support sampleRate
    if ('AudioContext' in globalThis) {
      baseOption.sampleRate = 48000;
    }
    this.cachedAudioContext = {
      ...baseOption,
      ...audioContextOption,
    };
    this.audioContext = new AudioContext(this.cachedAudioContext);
    this.mixers = new Set();
    this.clips = new Set();
  }

  /**
   * Attempt to resume the AudioContext used in the AudioStation
   */
  activate() {
    if (this.destroyed) {
      throw new Error('The audio station was destroyed');
    }
    return this.audioContext!.resume();
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
    this.audioContext = null;
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
    this.audioContext?.close();
    const newAudioContext = new AudioContext(this.cachedAudioContext);
    this.mixers.forEach((mixer) => {
      mixer.replaceAudioContext(newAudioContext);
    });
    // TODO: event to other component
    this.audioContext = newAudioContext;
  }

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
