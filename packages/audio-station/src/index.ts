import { AudioStation } from './audioStation';

export { AudioStation } from './audioStation';
export { AudioClip } from './audioClip';
export { AudioMixer } from './audioMixer';
export { AudioSource } from './audioSource';

let globalAudioStation: AudioStation | null = null;
export const getGlobalAudioStation = () => {
  if (globalAudioStation == null) {
    globalAudioStation = new AudioStation();
  }
  return globalAudioStation;
};
