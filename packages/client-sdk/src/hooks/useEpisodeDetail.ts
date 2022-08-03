import React from 'react';

import { useRemoteData } from './useRemoteData';

import type { IEpisodeDetail } from '../types/IEpisodeDetail';

export const useEpisodeDetail = (episodeId: string | null): IEpisodeDetail | null => {
  const [episodeDetail, episodeDetailController] = useRemoteData<IEpisodeDetail>(episodeId);

  React.useEffect(() => {
    episodeDetailController.reset();
    if (episodeId !== null) {
      episodeDetailController.execute();
    }
  }, [episodeId]);

  return episodeDetail.result;
};
