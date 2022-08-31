import * as React from 'react';
import debug from 'debug';

import { atom } from 'nanostores';

import type {
  EpisodeCore,
  InternalEpisodeData,
} from '@recative/core-manager';
import type {
  AssetForClient,
  IResourceItemForClient,
} from '@recative/definitions';

import useConstant from 'use-constant';

import { useBugFreeStore } from '../../../hooks/useBugFreeStore';

const log = debug('player:initializer');

export interface PlayerAssetProp extends Omit<AssetForClient, 'duration'> {
  duration: number | null;
}

const FALSE_STORE = atom(false);

export const useEpisodeInitializer = (
  assets: PlayerAssetProp[],
  resources: IResourceItemForClient[],
  preferredUploaders: string[],
  trustedUploaders: string[],
  core: EpisodeCore,
) => {
  const [episodeData, setEpisodeData] = React.useState<InternalEpisodeData | null>(null);
  const episodeInitialized = useConstant(() => ({ value: false }));

  React.useEffect(() => {
    if (episodeInitialized.value) return;
    if (!assets || !resources) return;

    episodeInitialized.value = true;

    const nextEpisodeData = core.initializeEpisode({
      assets: assets.map((asset) => ({
        ...asset,
        duration: asset.duration === null ? Infinity : asset.duration,
      })),
      resources,
      preferredUploaders,
      trustedUploaders,
    });

    setEpisodeData(nextEpisodeData);
  }, [assets, core, episodeInitialized, preferredUploaders, resources, trustedUploaders]);

  const urlCached = useBugFreeStore(episodeData?.preloader.urlCached ?? FALSE_STORE);
  const blockingResourcesCached = useBugFreeStore(
    episodeData?.preloader.blockingResourceCached ?? FALSE_STORE,
  );

  const playerLoading = !urlCached || !blockingResourcesCached;

  log(`Loading screen showed, reason: urlCached -> ${urlCached}, blockingResourcesCached -> ${blockingResourcesCached}`);

  return { episodeData, episodeInitialized, playerLoading };
};
