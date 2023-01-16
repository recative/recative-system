import type { AudioContext, GainNode } from 'standardized-audio-context';

import EventTarget from '@ungap/event-target';
import type { AudioSource } from './audioSource';
import type { AudioStation } from './audioStation';
import type { CustomEventHandler } from './util';

export type AudioMixerEventTarget = EventTarget & {
  addEventListener(
    type: 'resume',
    callback: CustomEventHandler<undefined>
  ): void;
  addEventListener(
    type: 'suspend',
    callback: CustomEventHandler<undefined>
  ): void;
  addEventListener(
    type: 'destroy',
    callback: CustomEventHandler<undefined>
  ): void;
};

/**
 * The audio mixer
 */
export class AudioMixer {
  station: AudioStation;

  node: GainNode<AudioContext> | null;

  sources: Set<AudioSource>;

  private cachedVolume = 1;

  readonly eventTarget = new EventTarget() as AudioMixerEventTarget;

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
    this.eventTarget.dispatchEvent(new CustomEvent('destroy'));
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
    this.eventTarget.dispatchEvent(new CustomEvent('suspend'));
  }

  /**
   * Resume the sources on the mixer
   */
  resume() {
    this.suspended = false;
    this.sources.forEach((source) => {
      source.resume();
    });
    this.eventTarget.dispatchEvent(new CustomEvent('resume'));
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

    this.cachedVolume = value;
    this.node!.gain.value = value;
  }

  /**
   * Replace audio context used in this mixer
   * Should be only used by AudioStation#reset
   */
  replaceAudioContext(newAudioContext: AudioContext) {
    const suspended = this.isSuspended();
    if (!suspended) {
      this.suspend();
    }
    this.node?.disconnect();
    this.node = null;
    const newNode = newAudioContext.createGain();
    newNode.connect(newAudioContext.destination);
    newNode.gain.value = this.cachedVolume;
    this.sources.forEach((source) => {
      source.replaceAudioContext(newAudioContext, newNode);
    });
    this.node = newNode;
    if (!suspended) {
      this.resume();
    }
  }
}
