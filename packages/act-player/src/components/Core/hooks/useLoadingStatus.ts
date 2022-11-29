import debug from 'debug';

import { atom } from 'nanostores';

import type { EpisodeCore } from '@recative/core-manager';

import { useBugFreeStore } from '../../../hooks/useBugFreeStore';

const log = debug('player:initializer');

const FALSE_STORE = atom(false);

export const useLoadingStatus = (core: EpisodeCore) => {
  const episodeData = core.getEpisodeData();

  const urlCached = useBugFreeStore(episodeData?.preloader.urlCached ?? FALSE_STORE);
  const blockingResourcesCached = useBugFreeStore(
    episodeData?.preloader.blockingResourceCached ?? FALSE_STORE,
  );

  const playerLoading = !urlCached || !blockingResourcesCached;

  log(`Loading screen showed, reason: urlCached -> ${urlCached}, blockingResourcesCached -> ${blockingResourcesCached}`);

  return playerLoading;
};
