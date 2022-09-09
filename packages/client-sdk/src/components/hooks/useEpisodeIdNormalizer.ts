import * as React from 'react';

import { useSdkConfig } from '../../hooks/useSdkConfig';

export const useEpisodeIdNormalizer = () => {
  const config = useSdkConfig();

  return React.useCallback((episodeId: string | undefined) => {
    if (!episodeId) return episodeId;

    const nEpisodeId = Number.parseInt(episodeId, 10);
    const parsedEpisodeId = Number.isNaN(nEpisodeId)
      ? episodeId
      : config.episodeOrderToEpisodeIdMap.get(nEpisodeId);

    if (!parsedEpisodeId) {
      throw new TypeError(`Episode id ${episodeId} not available`);
    }

    return parsedEpisodeId;
  }, [config.episodeOrderToEpisodeIdMap]);
};
