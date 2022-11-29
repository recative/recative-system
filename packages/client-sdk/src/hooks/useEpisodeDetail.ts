import React from 'react';

import { useRemoteData } from './useRemoteData';

import type { IEpisodeDetail } from '../types/IEpisodeDetail';
import { useEpisodeIdNormalizer } from '../components/hooks/useEpisodeIdNormalizer';

export const useEpisodeDetail = (episodeId: string | null): IEpisodeDetail | null => {
  const normalizeEpisodeId = useEpisodeIdNormalizer();

  const [episodeDetail, episodeDetailController] = useRemoteData<IEpisodeDetail>(
    normalizeEpisodeId(episodeId ?? undefined) ?? null,
  );

  React.useEffect(() => {
    episodeDetailController.reset();
    if (episodeId !== null) {
      episodeDetailController.execute();
    }
  }, [episodeDetailController, episodeId]);

  return episodeDetail.result;
};
