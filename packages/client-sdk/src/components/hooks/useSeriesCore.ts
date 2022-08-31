import * as React from 'react';
import useConstant from 'use-constant';
import { useStore } from '@nanostores/react';

import { SeriesCore } from '@recative/core-manager';
import type { ISeriesCoreConfig, IEpisodeMetadata } from '@recative/core-manager';

import { useDataFetcher } from './useDataFetcher';

export const useSeriesCore = <EnvVariable extends Record<string, unknown>>(
  preferredUploaders: string[],
  trustedUploaders: string[],
  rawEpisodeMetadata: Omit<IEpisodeMetadata, 'episodeData'>,
  getInjectedEpisodeMetadata: ((x: IEpisodeMetadata) => IEpisodeMetadata) | undefined,
  navigate: ISeriesCoreConfig['navigate'],
) => {
  const fetchData = useDataFetcher();

  const getEpisodeMetadata = React.useCallback(
    (nextEpisodeId: string): IEpisodeMetadata => {
      const notInjectedEpisodeMetadata = {
        ...rawEpisodeMetadata,
        episodeData: fetchData(nextEpisodeId).then(({ resources, assets }) => ({
          resources,
          assets,
          preferredUploaders,
          trustedUploaders,
        })),
      };
      return getInjectedEpisodeMetadata?.(notInjectedEpisodeMetadata) ?? notInjectedEpisodeMetadata;
    },
    [
      fetchData,
      getInjectedEpisodeMetadata,
      preferredUploaders,
      rawEpisodeMetadata,
      trustedUploaders,
    ],
  );

  const seriesCore = useConstant(() => new SeriesCore<EnvVariable>({
    navigate,
    getEpisodeMetadata,
  }));

  const episodeCore = useStore(seriesCore.currentEpisodeCore);

  React.useEffect(() => {
    seriesCore.updateConfig({
      navigate,
      getEpisodeMetadata,
    });
  }, [navigate, getEpisodeMetadata, seriesCore]);

  return { episodeCore, seriesCore };
};
