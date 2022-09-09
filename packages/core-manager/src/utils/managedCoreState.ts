import SRTParser from 'srt-parser-2';
import {
  ManagedCoreState,
  IResourceFileForClient,
  BGM_CORE_STATE_EXTENSION_ID,
  SUBTITLE_MANAGED_CORE_STATE_EXTENSION_ID,
} from '@recative/definitions';

import { BGMSpec } from '../audio/bgmManager';
import type { BGMStateSpec, InternalEpisodeData } from '../types';

import { RawAudioClipResponse, selectUrlAudioTypePostProcess } from './selectUrlAudioTypePostProcess';
import { PostProcessCallback } from './tryValidResourceUrl';

export const filterBGMState = (
  states: Set<ManagedCoreState<unknown>>,
  episodeData: InternalEpisodeData | null,
): BGMSpec[] => {
  if (!episodeData) {
    return [];
  }
  const bgmStates = new Map<string, BGMStateSpec>();
  states.forEach((state) => {
    if (state.managedStateExtensionId === BGM_CORE_STATE_EXTENSION_ID) {
      bgmStates.set(state.id, state.spec as BGMStateSpec);
    }
  });
  const resources: IResourceFileForClient[] = [];
  bgmStates.forEach((state) => {
    const resource = episodeData.resources.filesById.get(state.resourceId);
    if (resource !== undefined) {
      resources.push(resource);
    }
  });

  const spec: BGMSpec[] = [];
  bgmStates.forEach((state, id) => {
    const audioClipPromise = episodeData.resources.getResourceById<
    RawAudioClipResponse,
    PostProcessCallback<RawAudioClipResponse, unknown>
    >(
      state.resourceId,
      null,
      undefined,
      selectUrlAudioTypePostProcess,
    );

    if (!audioClipPromise) {
      return;
    }

    spec.push({
      id,
      audioClipResponse: audioClipPromise,
    });
  });
  return spec;
};

export const filterSubtitleState = (states: Set<ManagedCoreState<unknown>>) => {
  const subtitle: string[] = [];
  states.forEach((state) => {
    if (
      state.managedStateExtensionId === SUBTITLE_MANAGED_CORE_STATE_EXTENSION_ID
    ) {
      subtitle.push(state.spec as string);
    }
  });
  return subtitle;
};

export const convertSRTToStatesWithPrefix = (srt: string, prefix: string) => {
  const subtitleData = new SRTParser().fromSrt(srt);
  return subtitleData.map((entry) => {
    const parseTime = (time: string) => {
      const numbers = time.split(/:|,/).map((str) => parseInt(str, 10)) as [
        number,
        number,
        number,
        number,
      ];
      return (
        numbers[3] + 1000 * (numbers[2] + 60 * (numbers[1] + 60 * numbers[0]))
      );
    };
    return {
      from: parseTime(entry.startTime),
      to: parseTime(entry.endTime),
      id: `${prefix}|${entry.id}`,
      managedStateExtensionId: SUBTITLE_MANAGED_CORE_STATE_EXTENSION_ID,
      spec: entry.text,
    };
  });
};

export const convertSRTToStates = (srt: string, instanceId: string) => {
  return convertSRTToStatesWithPrefix(srt, `${instanceId}|subtitle|main`);
};
