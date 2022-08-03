import { getGlobalAudioStation } from '@recative/audio-station';
import type { AudioClip } from '@recative/audio-station';

export interface RawAudioClipResponse {
  url: string;
  audioClip: AudioClip;
}

export const selectUrlAudioTypePostProcess = async (
  url: string,
): Promise<RawAudioClipResponse | null> => {
  try {
    const audioStation = getGlobalAudioStation();

    const arrayBuffer = await (await fetch(url)).arrayBuffer();

    const audioClip = await audioStation.loadFromBuffer(arrayBuffer);

    return { url, audioClip };
  } catch (e) {
    return null;
  }
};
