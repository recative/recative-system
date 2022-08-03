import type { AudioSource } from 'audioSource';
import type { AudioContext, GainNode } from 'standardized-audio-context';
import type { AudioStation } from './audioStation';
/**
 * The audio mixer
 */
export class AudioMixer {
  station: AudioStation;

  node: GainNode<AudioContext> | null;

  sources: Set<AudioSource>;

  private suspended = false;

  constructor(station: AudioStation) {
    if (station.destroyed) {
      throw new Error('The audio station was destroyed');
    }
    station.mixers.add(this);
    this.sources = new Set();
    this.station = station;
    const node = station.audioContext!.createGain();
    node.connect(this.station.audioContext!.destination);
    this.node = node;
  }

  /**
   * Dispose the audio mixer
   */
  destroy() {
    this.station.mixers.delete(this);
    Array.from(this.sources).forEach((source) => {
      source.destroy();
    });
    this.node?.disconnect();
    this.node = null;
  }

  /**
   * Check if the audio mixer destroyed
   */
  get destroyed() {
    return this.node == null;
  }

  /**
   * Suspend the sources on the mixer
   */
  suspend() {
    this.suspended = true;
    this.sources.forEach((source) => {
      source.suspend();
    });
  }

  /**
   * Resume the sources on the mixer
   */
  resume() {
    this.suspended = false;
    this.sources.forEach((source) => {
      source.resume();
    });
  }

  /**
   * Is the mixer suspended
   */
  isSuspended() {
    return this.suspended;
  }

  /**
   * Get the volume of this mixer
   */
  get volume() {
    if (this.destroyed) {
      throw new Error('The audio mixer was destroyed');
    }
    return this.node!.gain.value;
  }

  /**
   * Set the volume of this mixer
   */
  set volume(value) {
    if (this.destroyed) {
      throw new Error('The audio mixer was destroyed');
    }

    if (!Number.isFinite(value)) {
      return;
    }

    if (Number.isNaN(value)) {
      return;
    }

    this.node!.gain.value = value;
  }
}
