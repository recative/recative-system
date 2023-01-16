import {
  AudioClip,
  AudioMixer,
  AudioSource,
  AudioStation,
  getGlobalAudioStation,
} from '@recative/audio-station';
import { IResourceFileForClient } from '@recative/definitions';
import { Clip as PhonographClip, mp3Adapter } from '@recative/phonograph';

export class PhonographClipWithAudioStation {
  phonograph: PhonographClip<unknown>;

  mixer: AudioMixer | null = null;

  constructor(public audioStation: AudioStation, url: string) {
    this.phonograph = new PhonographClip({
      context: audioStation.audioContext!,
      url,
      adapter: mp3Adapter,
    }) as PhonographClip<unknown>;
    this.audioStation.eventTarget.addEventListener(
      'reset',
      this.audioStationResetHandler
    );
  }

  setMixer(mixer: AudioMixer | null) {
    if (this.mixer !== null) {
      this.phonograph.disconnect(this.mixer.node!);
    }
    this.mixer = mixer;
    if (this.mixer !== null) {
      this.phonograph.connect(this.mixer.node!);
    }
  }

  dispose() {
    this.audioStation.eventTarget.removeEventListener(
      'reset',
      this.audioStationResetHandler
    );
    this.phonograph.dispose();
  }

  audioStationResetHandler = () => {
    this.phonograph._disconnectAllAndReplaceAudioContext(
      this.audioStation.audioContext!
    );
    if (this.mixer !== null) {
      this.phonograph.connect(this.mixer.node!);
    }
  };
}

/**
 * Common interface for Audio Player on different backends
 */
export interface AudioElement {
  play(): void;
  pause(): void;
  stop(): void;
  isPlaying(): boolean;
  destroy(): void;
  readonly destroyed: boolean;
  readonly stuck: boolean;
  volume: number;
  time: number;
  loop: boolean;
  fade(startVolume: number, endVolume: number, duration: number): void;
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

  stop() {
    this.source?.stop();
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
    return this.source === null;
  }

  readonly stuck = false;

  get volume() {
    return this.source?.volume ?? 0;
  }

  set volume(volume: number) {
    if (this.source !== null) {
      this.source.volume = volume;
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

  get loop() {
    return this.source?.loop ?? false;
  }

  set loop(value) {
    if (this.source !== null) {
      this.source.loop = value;
    }
  }

  fade(startVolume: number, endVolume: number, duration: number) {
    this.source?.fade(startVolume, endVolume, duration);
  }
}

export class PhonographAudioElement implements AudioElement {
  private clip: PhonographClipWithAudioStation | null = null;

  private suspended = false;

  private playing = false;

  private updateActualPlay = () => {
    if (this.playing && !this.suspended) {
      if (!this.clip?.phonograph?.playing) {
        this.clip?.phonograph?.play()?.catch(() => {});
      }
    } else if (this.clip?.phonograph?.playing) {
      this.clip?.phonograph?.pause();
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

  constructor(private mixer: AudioMixer, clip: PhonographClipWithAudioStation) {
    this.clip = clip;
    clip.setMixer(mixer);
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

  stop() {
    this.clip?.phonograph?.pause();
    if (this.clip !== null) {
      this.clip.phonograph.currentTime = 0;
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  destroy(): void {
    this.clip?.setMixer(null);
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
    return this.clip?.phonograph?.stuck ?? false;
  }

  get volume() {
    return this.clip?.phonograph?.volume ?? 0;
  }

  set volume(volume: number) {
    if (this.clip !== null) {
      this.clip.phonograph.volume = volume;
    }
  }

  get time(): number {
    if (this.clip !== null) {
      return this.clip.phonograph.currentTime;
    }
    return 0;
  }

  set time(value: number) {
    if (this.clip !== null) {
      this.clip.phonograph.currentTime = value;
    }
  }

  get loop() {
    if (this.clip !== null) {
      return this.clip.phonograph.loop;
    }
    return false;
  }

  set loop(value) {
    if (this.clip !== null) {
      this.clip.phonograph.loop = value;
    }
  }

  fade(startVolume: number, endVolume: number, duration: number) {
    if (this.clip !== null) {
      this.clip.phonograph.fade(startVolume, endVolume, duration);
    }
  }
}

export interface BasicAudioElementInit {
  backend?: 'basic';
  clip: AudioClip;
  url: string;
}

export interface PhonographAudioElementInit {
  backend: 'phonograph';
  clip: PhonographClipWithAudioStation;
}

export type AudioElementInit =
  | BasicAudioElementInit
  | PhonographAudioElementInit;

export const createAudioElement = (
  mixer: AudioMixer,
  init: AudioElementInit
): AudioElement => {
  if (init.backend === 'phonograph') {
    return new PhonographAudioElement(mixer, init.clip);
  }
  return new BasicAudioElement(mixer, init.clip);
};

export const destroyAudioElementInit = (init: AudioElementInit) => {
  if (init.backend === 'phonograph') {
    return init.clip.dispose();
  }
  return init.clip.destroy();
};

export const getAudioElementInitUrl = (init: AudioElementInit) => {
  if (init.backend === 'phonograph') {
    return init.clip.phonograph.url;
  }
  return init.url;
};

export const selectUrlBasicAudioElementInitPostProcess = async (
  url: string
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
  url: string
): Promise<AudioElementInit | null> => {
  try {
    const audioStation = getGlobalAudioStation();

    const phonographClip = new PhonographClipWithAudioStation(
      audioStation,
      url
    );

    // wait for canplaythrough
    await phonographClip.phonograph.buffer(true);

    return { clip: phonographClip, backend: 'phonograph' };
  } catch (e) {
    return null;
  }
};

const AUDIO_BACKEND_EXTENSION_KEY =
  '@recative/extension-audio-backends/PhonographAudioBackend~~backend';

export const selectUrlAudioElementInitPostProcess = async (
  url: string,
  metadata?: IResourceFileForClient
): Promise<AudioElementInit | null> => {
  if (
    metadata?.extensionConfigurations?.[AUDIO_BACKEND_EXTENSION_KEY] === 'yes'
  ) {
    return selectUrlPhonographAudioElementInitPostProcess(url);
  }
  return selectUrlBasicAudioElementInitPostProcess(url);
};
