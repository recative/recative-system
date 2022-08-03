import type { AudioSource } from 'audioSource';
import type { AudioStation } from './audioStation';

/**
 * The audio buffer
 */
export class AudioClip {
  station: AudioStation;

  buffer: AudioBuffer | null;

  sources: Set<AudioSource>;

  constructor(station: AudioStation, buffer: AudioBuffer) {
    if (station.destroyed) {
      throw new Error('The audio station was destroyed');
    }
    station.clips.add(this);
    this.sources = new Set();
    this.station = station;
    this.buffer = buffer;
  }

  /**
   * Dispose the audio buffer
   */
  destroy() {
    this.station.clips.delete(this);
    Array.from(this.sources).forEach((source) => {
      source.destroy();
    });
    this.buffer = null;
  }

  /**
   * Duration of the audio buffer
   */
  get duration() {
    if (this.destroyed) {
      throw new Error('The audio clip was destroyed');
    }
    return this.buffer!.duration;
  }

  /**
   * Check if the audio buffer destroyed
   */
  get destroyed() {
    return this.buffer == null;
  }
}
