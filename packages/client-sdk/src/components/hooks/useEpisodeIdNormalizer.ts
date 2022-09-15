import * as React from 'react';

import { useSdkConfig } from '../../hooks/useSdkConfig';

const isNumeric = (value: string) => {
  return /^-?\d+$/.test(value);
};

export const useEpisodeIdNormalizer = () => {
  const config = useSdkConfig();

  return React.useCallback((episodeId: string | undefined) => {
    if (!episodeId) return episodeId;

    const nEpisodeId = Number.parseInt(episodeId, 10);
    const parsedEpisodeId = isNumeric(episodeId) && Number.isNaN(nEpisodeId)
      ? episodeId
      : config.episodeOrderToEpisodeIdMap.get(nEpisodeId);

    if (!parsedEpisodeId) {
      throw new TypeError(`Episode id ${episodeId} not available`);
    }

    return parsedEpisodeId;
  }, [config.episodeOrderToEpisodeIdMap]);
};
