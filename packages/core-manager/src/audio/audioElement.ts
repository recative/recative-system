import {
  AudioClip,
  AudioMixer,
  AudioSource,
  getGlobalAudioStation,
} from '@recative/audio-station';
import { Clip as PhonographClip } from '@recative/phonograph';

/**
 * Common interface for Audio Player on different backends
 */
export interface AudioElement {
  play(): void;
  pause(): void;
  isPlaying(): boolean;
  destroy(): void;
  get destroyed(): boolean;
  setVolume(volume: number): void;
  get time(): number;
  set time(value: number);
}

export class BasicAudioElement implements AudioElement {
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

export class PhonographAudioElement implements AudioElement {
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

export type AudioElementInit = {
  backend?: 'basic',
  clip: AudioClip,
  url: string,
} | {
  backend: 'phonograph',
  clip: PhonographClip,
};

export const createAudioElement = (mixer: AudioMixer, init:AudioElementInit):AudioElement => {
  if (init.backend === 'phonograph') {
    return new PhonographAudioElement(mixer, init.clip);
  }
  return new BasicAudioElement(mixer, init.clip);
};

export const destroyAudioElementInit = (init:AudioElementInit) => {
  if (init.backend === 'phonograph') {
    return init.clip.dispose();
  }
  return init.clip.destroy();
};

export const getAudioElementInitUrl = (init:AudioElementInit) => {
  if (init.backend === 'phonograph') {
    return init.clip.url;
  }
  return init.url;
};

export const selectUrlBasicAudioElementInitPostProcess = async (
  url: string,
): Promise<AudioElementInit | null> => {
  try {
    const audioStation = getGlobalAudioStation();

    const arrayBuffer = await (await fetch(url)).arrayBuffer();

    const audioClip = await audioStation.loadFromBuffer(arrayBuffer);

    return { url, clip: audioClip, backend: 'basic' };
  } catch (e) {
    return null;
  }
};
