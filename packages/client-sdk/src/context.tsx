import React from 'react';
import debug from 'debug';

import { useAsync } from '@react-hookz/web';

import { fetch } from './utils/fetch';
import type { IClientSdkConfig } from './types/IClientSdkConfig';
import type { IEpisodeAbstraction } from './types/IEpisodeDetail';

const log = debug('client:provider');

export interface IClientSdkConfigContextValue extends IClientSdkConfig {
  setClientSdkConfig: React.Dispatch<React.SetStateAction<IClientSdkConfig>>;
}

export const ClientSdkContext = React.createContext<IClientSdkConfigContextValue | null>(null);

/**
 * The properties interface for a player SDK provider component in a React
 * application.
 */
export interface IPlayerSdkProviderProps {
  /**
   * The path pattern for the data to be retrieved by the player SDK. This value
   * should be a string, which could includes two placeholders for the specific
   * data to be retrieved. 
   * 
   * The placeholders are `$fileName` and `$dataType` respectively, which will
   * be replaced by the actual values at runtime.
   *
   * @Example "/bundle/data/$fileName.$dataType"
   */
  pathPattern: string;

  /**
   * The data type of the data to be retrieved by the player SDK. This value
   * should be one of the following strings: "bson", "json", or "uson".
   */
  dataType: 'bson' | 'json' | 'uson';

  /**
   * The child elements to be rendered inside the player SDK provider component.
   */
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
