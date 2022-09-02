import * as React from 'react';

import { useEpisodeIdNormalizer } from './useEpisodeIdNormalizer';

export const useWrappedOnEpisodeUpdate = (
  onEpisodeUpdate: (episodeId: string, forceReload?: boolean) => Promise<void>,
) => {
  const normalizeEpisodeId = useEpisodeIdNormalizer();

  return React.useCallback((episodeId: string, forceReload?: boolean) => {
    const normalizedEpisodeId = normalizeEpisodeId(episodeId);

    return onEpisodeUpdate(normalizedEpisodeId, forceReload);
  }, [normalizeEpisodeId, onEpisodeUpdate]);
};
