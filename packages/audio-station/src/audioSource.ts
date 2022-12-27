import type {
  AudioBufferSourceNode,
  AudioContext,
  GainNode,
} from 'standardized-audio-context';
import type { AudioStation } from './audioStation';
import type { AudioClip } from './audioClip';
import type { AudioMixer } from './audioMixer';

/**
 * The audio source
 */
export class AudioSource {
  station: AudioStation;

  mixer: AudioMixer;

  clip: AudioClip;

  source: AudioBufferSourceNode<AudioContext> | null;

  gain: GainNode<AudioContext> | null;

  private playing = false;

  isPlaying() {
    return this.playing;
  }

  private suspended = false;

  private progressCalculated = true;

  private lastStartTime = 0;

  private progress = 0;

  private looping = false;

  private fadeTarget = 1;

  private endHandlers = new Set<() => void>();

  constructor(mixer: AudioMixer, clip: AudioClip) {
    if (mixer.destroyed) {
      throw new Error('The audio mixer was destroyed');
    }
    if (clip.destroyed) {
      throw new Error('The audio clip was destroyed');
    }
    if (mixer.station !== clip.station) {
      throw new Error('Mismatch AudioStation between AudioMixer and AudioClip');
    }
    clip.sources.add(this);
    mixer.sources.add(this);
    this.station = mixer.station;
    this.mixer = mixer;
    this.clip = clip;
    this.source = null;
    this.suspended = this.mixer.isSuspended();
    const gain = this.station.audioContext!.createGain();
    gain.connect(this.mixer.node!);
    this.gain = gain;
  }

  /**
   * Dispose the audio source
   */
  destroy() {
    this.clip.sources.delete(this);
    this.mixer.sources.delete(this);
    this.destroySource();
    this.gain?.disconnect();
    this.gain = null;
    this.endHandlers.clear();
  }

  /**
   * Check if the audio source destroyed
   */
  get destroyed() {
    return this.gain == null;
  }

  private ensureNotDestroyed() {
    if (this.destroyed) {
      throw new Error('The audio clip was destroyed');
    }
  }

  private destroySource() {
    this.source?.removeEventListener('ended', this.onEnd);
    this.source?.stop();
    this.source?.disconnect();
    this.source = null;
  }

  private resetSource() {
    this.destroySource();
    const source = this.station.audioContext!.createBufferSource();
    source.buffer = this.clip.buffer;
    source.connect(this.gain!);
    source.addEventListener('ended', this.onEnd);
    source.loop = this.looping;
    this.source = source;
  }

  private handleSourceEnd() {
    this.calculateProgress();
    this.playing = false;
    this.progress = 0;
    this.endHandlers.forEach((handler) => {
      handler();
    });
  }

  private calculateProgress() {
    const { time } = this.station;
    if (!this.progressCalculated) {
      this.progress += time - this.lastStartTime;
      if (this.loop && this.progress > this.clip.duration) {
        this.progress %= this.clip.duration;
      }
    }
    this.lastStartTime = time;
    this.progressCalculated = true;
  }

  private onEnd = this.handleSourceEnd.bind(this);

  /**
   * Play or resume the source
   * Do not works when the source is already playing
   */
  play() {
    this.ensureNotDestroyed();
    if (this.playing) {
      return;
    }
    this.playing = true;
    if (this.suspended) {
      return;
    }
    this.calculateProgress();
    this.progressCalculated = false;
    this.resetSource();
    if (this.progress < 0) {
      this.source?.start(
        this.station.audioContext!.currentTime - this.progress
      );
    } else {
      this.source?.start(0, this.progress);
    }
  }

  /**
   * Pause the source
   */
  pause() {
    this.ensureNotDestroyed();
    this.stopFade();
    this.playing = false;
    this.destroySource();
    this.calculateProgress();
  }

  /**
   * Stop the source, same as pause and seek to 0
   */
  stop() {
    this.ensureNotDestroyed();
    this.pause();
    this.time = 0;
  }

  /**
   * Suspend the source, this should only be called from mixer
   */
  suspend() {
    this.ensureNotDestroyed();
    this.stopFade();
    this.suspended = true;
    this.destroySource();
    this.calculateProgress();
  }

  /**
   * Resume the source, this should only be called from mixer
   */
  resume() {
    this.ensureNotDestroyed();
    if (!this.suspend) {
      return;
    }
    this.suspended = false;
    if (this.playing) {
      this.calculateProgress();
      this.progressCalculated = false;
      this.resetSource();
      if (this.progress < 0) {
        this.source?.start(
          this.station.audioContext!.currentTime - this.progress
        );
      } else {
        this.source?.start(0, this.progress);
      }
    }
  }

  /**
   * Get the current progress of the source
   */
  get time() {
    this.ensureNotDestroyed();
    if (this.progressCalculated) {
      return this.progress;
    }
    let result = this.progress + this.station.time - this.lastStartTime;
    if (this.loop && result > this.clip.duration) {
      result %= this.clip.duration;
    }
    return result;
  }

  /**
   * Set the current progress of the source, seek the source
   */
  set time(value) {
    this.ensureNotDestroyed();
    const { playing } = this;
    if (playing) {
      this.pause();
    }
    this.progress = value;
    this.progressCalculated = true;
    if (playing) {
      this.play();
    } else {
      this.destroySource();
    }
  }

  /**
   * Get if the source is looping
   */
  get loop() {
    this.ensureNotDestroyed();
    return this.looping;
  }

  /**
   * Set if the source is looping
   */
  set loop(value) {
    this.ensureNotDestroyed();
    if (value === this.looping) {
      return;
    }
    const { playing } = this;
    if (playing) {
      this.pause();
    }
    this.calculateProgress();
    this.looping = value;
    if (playing) {
      this.play();
    } else {
      this.destroySource();
    }
  }

  /**
   * Get the volume of this source
   */
  get volume() {
    this.ensureNotDestroyed();
    return this.gain!.gain.value;
  }

  /**
   * Set the volume of this source
   */
  set volume(value) {
    this.ensureNotDestroyed();

    if (!Number.isFinite(value)) {
      return;
    }

    if (Number.isNaN(value)) {
      return;
    }

    this.stopFade();
    this.gain!.gain.value = value;
    this.fadeTarget = value;
  }

  /**
   * Fade the audio source from a start volume to an end volume
   * May be interrupted by stop, pause, suspend, set volume, or another fade
   */
  fade(startVolume: number, endVolume: number, duration: number) {
    this.ensureNotDestroyed();
    this.stopFade();
    if (this.suspended || !this.playing) {
      this.volume = endVolume;
      return;
    }
    const now = this.mixer.station.time;
    this.gain!.gain.value = startVolume;
    this.gain!.gain.linearRampToValueAtTime(endVolume, now + duration);
    this.fadeTarget = endVolume;
  }

  private stopFade() {
    const now = this.mixer.station.time;
    this.gain!.gain.cancelScheduledValues(now);
    this.gain!.gain.value = this.fadeTarget;
  }

  /**
   * Add a handler to be called when the audio source end itself without manually stop
   */
  addEndHandler(handler: () => void) {
    this.ensureNotDestroyed();
    this.endHandlers.add(handler);
  }

  /**
   * Remove a handler previously added by `addEndHandler`
   */
  removeEndHandler(handler: () => void) {
    this.ensureNotDestroyed();
    this.endHandlers.delete(handler);
  }

  /**
   * Replace audio context used in this source
   * Should be only used by AudioMixer#replaceAudioContext
   */
  replaceAudioContext(
    newAudioContext: AudioContext,
    newMixerNode: GainNode<AudioContext>
  ) {
    // The source should be suspended here
    // so we do not need to replace source node since it do not exist
    this.gain?.disconnect();
    this.gain = null;
    const newGain = newAudioContext.createGain();
    newGain.connect(newMixerNode);
    this.gain = newGain;
  }
}
