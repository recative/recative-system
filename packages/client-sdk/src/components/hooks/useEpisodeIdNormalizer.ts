import * as React from 'react';

import { useSdkConfig } from '../../external';

export const useEpisodeIdNormalizer = () => {
  const config = useSdkConfig();

  const episodeIdMapByOrder = React.useMemo(() => {
    const result = new Map<number, string>();

    config.episodesMap.forEach((episode) => result.set(episode.order, episode.id));

    return result;
  }, [config.episodesMap]);

  return React.useCallback((episodeId: string | undefined) => {
    if (!episodeId) return episodeId;

    const nEpisodeId = Number.parseInt(episodeId, 10);
    const parsedEpisodeId = Number.isNaN(nEpisodeId)
      ? episodeId
      : episodeIdMapByOrder.get(nEpisodeId);

    if (!parsedEpisodeId) {
      throw new TypeError(`Episode id ${episodeId} not available`);
    }

    return parsedEpisodeId;
  }, [episodeIdMapByOrder]);
};
