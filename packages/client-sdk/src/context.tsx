import React from 'react';
import debug from 'debug';

import { useAsync } from '@react-hookz/web';

import { fetch, cache } from './utils/fetch';
import type { IClientSdkConfig } from './types/IClientSdkConfig';
import type { IEpisodeAbstraction } from './types/IEpisodeDetail';

const log = debug('client:provider');

export interface IClientSdkConfigContextValue extends IClientSdkConfig {
  setClientSdkConfig: React.Dispatch<React.SetStateAction<IClientSdkConfig>>;
}

export const ClientSdkContext = React.createContext<IClientSdkConfigContextValue | null>(null);

interface IPlayerSdkProviderProps {
  pathPattern: string;
  dataType: 'bson' | 'json' | 'uson';
  children: React.ReactNode;
}

export const PlayerSdkProvider: React.FC<IPlayerSdkProviderProps> = ({
  pathPattern,
  dataType = 'bson',
  ...props
}) => {
  const [clientSdkConfig, setClientSdkConfig] = React.useState<IClientSdkConfig>({
    pathPattern,
    episodesMap: new Map(),
    episodeOrderToEpisodeIdMap: new Map(),
    initialAssetStatus: undefined,
    videoModalUrls: [],
    dataType,
    requestStatus: {},
  });

  React.useEffect(() => {
    setClientSdkConfig((previousClientSdkConfig) => ({
      ...previousClientSdkConfig,
      pathPattern,
      dataType,
    }));
  }, [pathPattern, dataType]);

  const fetchEpisodes = React.useCallback(async () => {
    log(`Fetching episode list with pattern: ${pathPattern} and data type: ${dataType}`);

    if (pathPattern) {
      const result = await fetch<IEpisodeAbstraction[]>(
        'episodes',
        dataType,
        pathPattern,
        setClientSdkConfig,
      );

      if (result) {
        for (let i = 0; i < result.length; i += 1) {
          const episode = result[i];
          cache(episode.episode.id, dataType, pathPattern);
        }
      }

      log('Fetched episode list,', result);
      return result;
    }

    log('No pathPattern provided');
    return null;
  }, [pathPattern, dataType]);

  const [episodes, episodesController] = useAsync(fetchEpisodes);

  React.useEffect(() => {
    episodesController.execute();
  }, [episodesController, fetchEpisodes]);

  React.useEffect(() => {
    log('Episode list updated: ', episodes.result);

    if (episodes.result) {
      const episodesMap = new Map();

      (episodes.result as IEpisodeAbstraction[]).forEach(({ episode }) => {
        episodesMap.set(episode.id, episode);
      });

      const episodeOrderToEpisodeIdMap = new Map<number, string>();

      episodesMap.forEach((episode) => episodeOrderToEpisodeIdMap.set(episode.order, episode.id));

      setClientSdkConfig((previousClientSdkConfig) => ({
        ...previousClientSdkConfig,
        episodesMap,
        episodeOrderToEpisodeIdMap,
      }));
    }
  }, [episodes.result]);

  const contextValue = React.useMemo(
    () => ({
      ...clientSdkConfig,
      setClientSdkConfig,
    }),
    [clientSdkConfig, setClientSdkConfig],
  );

  return (
    <ClientSdkContext.Provider value={contextValue}>
      {props.children}
    </ClientSdkContext.Provider>
  );
};
