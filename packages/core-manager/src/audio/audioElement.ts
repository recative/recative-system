import {
  AudioClip,
  AudioMixer,
  AudioSource,
  getGlobalAudioStation,
} from '@recative/audio-station';
import { IResourceFileForClient } from '@recative/definitions';
import { Clip as PhonographClip, mp3Adapter } from '@recative/phonograph';

/**
 * Common interface for Audio Player on different backends
 */
export interface AudioElement {
  play(): void;
  pause(): void;
  isPlaying(): boolean;
  destroy(): void;
  get destroyed(): boolean;
  get stuck(): boolean;
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

  // eslint-disable-next-line class-methods-use-this
  get stuck() {
    return false;
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
  private clip: PhonographClip<any> | null = null;

  private suspended = false;

  private playing = false;

  private updateActualPlay = () => {
    if (this.playing && !this.suspended) {
      if (!this.clip?.playing) {
        this.clip?.play()?.catch(() => {});
      }
    } else if (this.clip?.playing) {
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

  constructor(private mixer: AudioMixer, clip: PhonographClip<any>) {
    this.clip = clip;
    clip.connect(mixer.node!);
    this.suspended = mixer.isSuspended();
    mixer.eventTarget.addEventListener('suspend', this.onMixerSuspend);
    mixer.eventTarget.addEventListener('resume', this.onMixerResume);
    mixer.eventTarget.addEventListener('destroy', this.onMixerDestroy);
  }

  play(): void {
    this.playing = true;
    this.updateActualPlay();
  }

  pause(): void {
    this.playing = false;
    this.updateActualPlay();
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

  get stuck() {
    return this.clip?.stuck ?? false;
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
  clip: PhonographClip<any>,
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

export const selectUrlPhonographAudioElementInitPostProcess = async (
  url: string,
): Promise<AudioElementInit | null> => {
  try {
    const audioStation = getGlobalAudioStation();

    const phonographClip = new PhonographClip({
      context: audioStation.audioContext!,
      url,
      adapter: mp3Adapter,
    });

    // wait for canplaythrough
    await phonographClip.buffer(true);

    return { clip: phonographClip, backend: 'phonograph' };
  } catch (e) {
    return null;
  }
};

const AUDIO_BACKEND_EXTENSION_KEY = '@recative/extension-audio-backends/PhonographAudioBackend~~backend';

export const selectUrlAudioElementInitPostProcess = async (
  url: string,
  metadata?: IResourceFileForClient,
): Promise<AudioElementInit | null> => {
  if (metadata?.extensionConfigurations?.[AUDIO_BACKEND_EXTENSION_KEY] === 'phonograph') {
    return selectUrlPhonographAudioElementInitPostProcess(url);
  }
  return selectUrlBasicAudioElementInitPostProcess(url);
};
