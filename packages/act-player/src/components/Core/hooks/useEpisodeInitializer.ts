import * as React from 'react';

import type {
  EpisodeCore,
  InternalEpisodeData,
} from '@recative/core-manager';
import type {
  IAssetForClient,
  IResourceItemForClient,
} from '@recative/definitions';

export interface PlayerAssetProp extends Omit<IAssetForClient, 'duration'> {
  duration: number | null;
}

export const useEpisodeInitializer = (
  assets: PlayerAssetProp[],
  resources: IResourceItemForClient[],
  preferredUploaders: string[],
  trustedUploaders: string[],
  core: EpisodeCore,
) => {
  const [episodeData, setEpisodeData] = React.useState<InternalEpisodeData | null>(null);
  const episodeInitialized = React.useRef(false);

  React.useLayoutEffect(() => {
    if (episodeInitialized.current) return;
    if (!assets || !resources) return;

    episodeInitialized.current = true;

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

  return { episodeData, episodeInitialized };
};
