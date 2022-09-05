import * as React from 'react';

import type { IEpisode } from '@recative/definitions';
import { IEpisodeDetail, useEpisodes } from '@recative/client-sdk';

import { getDiagnosisInformation } from '../utils/getDiagnosisInformation';

export const useEnvVariable = (
  episode: IEpisode | undefined,
  episodeDetail: IEpisodeDetail | null,
) => {
  const episodes = useEpisodes();

  const saves = React.useMemo(() => {
    return [...episodes.values()].map((item) => ({
      id: item.id,
      order: item.order,
      idInOrder: item.order,
      idInDatabase: item.id,
      idInActServer: item.id,
      title: item.label,
      assetStatus: [],
    }));
  }, [episodes]);

  const diagnosisInformation = getDiagnosisInformation();

  const result = React.useMemo(() => {
    return {
      saves,
      episode,
      episodeId: episode?.id,
      episodeOrder: episode?.order,
      /**
       * @deprecated This is key for legacy implementation, use `episodeOrder`
       *             instead.
       */
      episodeIdInOrder: episode?.order,
      /**
       * @deprecated This is key for legacy implementation, use `episodeId`
       *             instead.
       */
      episodeIdInDatabase: episode?.id,
      assets: episodeDetail?.assets,
      episodes: saves,
      diagnosisInformation,
    };
  }, [saves, episode, diagnosisInformation, episodeDetail]);

  return result;
};
