/* eslint-disable no-await-in-loop */
import React from 'react';
import debug from 'debug';

import type { IEpisode, AssetForClient, UserImplementedFunctions } from '@recative/definitions';

import { useSdkConfig } from './useSdkConfig';
import type { IRpcFunction } from '../types/IRpcFunction';

const log = debug('client:user-fn');

export const notImplemented = (x: string) => {
  log(`ERROR: ${x} is not implemented!`);
};

export const useResetAssetStatusCallback = () => React.useCallback(() => {
  const config = useSdkConfig();

  config.setClientSdkConfig({ ...config, initialAssetStatus: undefined });
}, []);

export interface InjectedFunctions {
  navigate: (url: string) => void;
  constructHomeUrl: () => string;
  constructSeriesUrl: (seriesId: string) => string;
  constructEpisodeUrl: (episodeId: string) => string;
  requestPayment: UserImplementedFunctions['requestPayment'];
}

export const useUserImplementedFunctions = (
  episodeId: string,
  assets: AssetForClient[] | null,
  episodes: IEpisode[] | null,
  injectedFunctions: InjectedFunctions,
  server: IRpcFunction,
): Partial<UserImplementedFunctions> | undefined => {
  const sdkConfig = useSdkConfig();
  const episodeMap = React.useMemo(() => {
    const result = new Map<string | number, IEpisode>();

    episodes?.forEach((episode) => {
      result.set(episode.id, episode);
      result.set(episode.order.toString(), episode);
      result.set(episode.order, episode);
    });

    return result;
  }, [episodes]);

  const episode = episodeMap.get(episodeId);

  const gotoEpisode: UserImplementedFunctions['gotoEpisode'] = React.useCallback(
    (seek, episodeOrder, forceReload, assetOrder, assetTime) => {
      log(`Received go to episode request, episode order: ${episodeOrder}`);
      if (episode?.order.toString() === episodeOrder) {
        log(`gotoEpisode Will seek: ${episodeOrder}`);
        if (assetOrder !== undefined && assetTime !== undefined) {
          seek(assetOrder, assetTime);
        }

        return;
      }

      const nextEpisode = [...episodeMap.values()].find((x) => x.order.toString() === episodeOrder);

      if (!nextEpisode) {
        log(`gotoEpisode episode NOT FOUND: ${episodeOrder}`);
        return;
      }

      log(`gotoEpisode Will jump: ${episodeOrder}`);
      const initialAssetStatus = assetOrder !== undefined && assetTime !== undefined
        ? {
          time: assetTime,
          order: assetOrder,
        }
        : undefined;

      sdkConfig.setClientSdkConfig({
        ...sdkConfig,
        initialAssetStatus,
      });

      const nextUrl = injectedFunctions.constructEpisodeUrl(nextEpisode.id);
      log(`Next URL is: ${nextUrl}`);

      if (!forceReload) {
        injectedFunctions.navigate(nextUrl);
      } else {
        window.location.href = nextUrl;
      }
    },
    [injectedFunctions],
  );

  const finishEpisode: UserImplementedFunctions['finishEpisode'] = React.useCallback(async () => {
    if (!assets) return;

    for (let i = 0; i < assets.length; i = i + 1) {
      const asset = assets[i];
      try {
        await server.markAssetFinished(asset.id);
      } catch (e) {
        log('Unable to mark asset as finished');
      }
    }
  }, [episodeId]);

  const unlockEpisode: UserImplementedFunctions['unlockEpisode'] = React.useCallback(
    async (unlockEpisodeId?: string) => {
      if (!unlockEpisodeId) return;

      const target = episodeMap.get(unlockEpisodeId);
      const unlockedEpisodes = await server.getUnlockedEpisodes();

      if (target === undefined) {
        throw new Error(`Target ${unlockEpisodeId} not found`);
      }

      if (unlockedEpisodes.includes(target.id)) {
        log(
          `⚠ Episode ${unlockEpisodeId} has already been unlocked, wont do anything`,
        );
        return;
      }

      try {
        await server.unlockEpisode(target.id);
      } catch (e) {
        log(e);
      }
    },
    [episodeMap],
  );

  const unlockAsset: UserImplementedFunctions['unlockAsset'] = React.useCallback(
    async (assetId: string) => {
      if (!assets) return;

      const asset = assets.find((x) => x.id === assetId);

      if (!asset) {
        throw new Error('Asset not found!');
      }

      try {
        await server.markAssetFinished(asset.id);
      } catch (e) {
        log('ERROR:', e);
      }
    },
    [assets, episodeId],
  );

  const requestPayment: UserImplementedFunctions['requestPayment'] = React.useCallback((request) => {
    if (!injectedFunctions.requestPayment) {
      return notImplemented('requestPayment');
    }
    return injectedFunctions.requestPayment(request);
  }, []);

  const showVideoModal: UserImplementedFunctions['showVideoModal'] = React.useCallback(() => {
    console.warn('Show video modal is not implemented');
    // sdkConfig.setClientSdkConfig({ ...sdkConfig, videoModalUrls: [] });
  }, []);

  const gotoSeries: UserImplementedFunctions['gotoSeries'] = React.useCallback(
    (seriesId) => {
      if (!injectedFunctions.constructEpisodeUrl) {
        return notImplemented('gotoSeries');
      }

      const nextUrl = injectedFunctions.constructEpisodeUrl(seriesId);
      return injectedFunctions.navigate(nextUrl);
    },
    [],
  );

  const enableAppFullScreenMode: UserImplementedFunctions['enableAppFullScreenMode'] = React.useCallback(() => {
    server.enableFullScreen?.();
    window.postMessage({ type: 'app:enableAppFullScreenMode' }, '*');
  }, []);

  const disableAppFullScreenMode: UserImplementedFunctions['disableAppFullScreenMode'] = React.useCallback(() => {
    server.disableFullScreen?.();
    window.postMessage({ type: 'app:disableAppFullScreenMode' }, '*');
  }, []);

  const getSavedData: UserImplementedFunctions['getSavedData'] = React.useCallback(async (slot) => {
    log('Will read saved data:', slot);

    try {
      const { data } = await server.getArchivedData(slot);

      const parsedData = JSON.parse(data || '');

      log(`😃 Read act save successfully, slot: ${slot}`);

      return parsedData;
    } catch (e) {
      log(`😭 Read act save failed, slot: ${slot}, error: ${e}`);
      throw e;
    }
  }, []);

  const setSavedData: UserImplementedFunctions['setSavedData'] = React.useCallback(async (slot, data) => {
    log(`Will write saved data: ${slot}`);

    try {
      const response = await server.updateArchivedData(
        slot,
        JSON.stringify(data),
      );

      log(`😃 Write act save successfully, slot: ${slot}`);

      return response;
    } catch (e) {
      log(`😭 Write act save failed, slot: ${slot}`);
      throw e;
    }
  }, []);

  const goHome = React.useCallback(() => {
    if (!injectedFunctions.constructHomeUrl) {
      return notImplemented('constructHomeUrl');
    }

    const nextUrl = injectedFunctions.constructHomeUrl();
    return injectedFunctions.navigate(nextUrl);
  }, [injectedFunctions.navigate]);

  const exit = React.useCallback(() => {
    window.close();
  }, [injectedFunctions.navigate]);

  const memorizedFunctions = React.useMemo(
    () => ({
      gotoEpisode,
      finishEpisode,
      unlockEpisode,
      unlockAsset,
      requestPayment,
      showVideoModal,
      gotoSeries,
      enableAppFullScreenMode,
      disableAppFullScreenMode,
      getSavedData,
      setSavedData,
      goHome,
      exit,
    }),
    [
      disableAppFullScreenMode,
      enableAppFullScreenMode,
      finishEpisode,
      getSavedData,
      gotoEpisode,
      gotoSeries,
      requestPayment,
      setSavedData,
      showVideoModal,
      unlockAsset,
      unlockEpisode,
      goHome,
      exit,
    ],
  );

  if (!assets || !episodes) {
    return undefined;
  }

  return memorizedFunctions;
};
