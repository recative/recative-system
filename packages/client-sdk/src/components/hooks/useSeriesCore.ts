import * as React from 'react';
import debug from 'debug';

import useConstant from 'use-constant';
import { useStore } from '@nanostores/react';

import { SeriesCore } from '@recative/core-manager';
import type { RawUserImplementedFunctions } from '@recative/definitions';
import type {
  EpisodeCore,
  IEpisodeMetadata,
  ISeriesCoreConfig,
  IUserRelatedEnvVariable,
} from '@recative/core-manager';

import { useDataFetcher } from './useDataFetcher';
import { IEpisodeDetail } from '../../external';
import { useEpisodeIdNormalizer } from './useEpisodeIdNormalizer';

const log = debug('sdk:series-core');
const logWarn = debug('sdk:series-core');
// eslint-disable-next-line no-console
logWarn.log = console.warn;

const useEpisodeDetailReloadDiagnosisTool = (
  id: string,
  diagnosisVariable: unknown,
  // This is acceptable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  episodeCore: EpisodeCore<any> | null,
) => {
  React.useEffect(() => {
    const episodeData = episodeCore?.getEpisodeData();

    if (episodeData) {
      logWarn(`${id} updated after episode initialized, this is not allowed`);
    }
  }, [diagnosisVariable, episodeCore, id]);
};

export const useSeriesCore = <EnvVariable extends Record<string, unknown>>(
  episodeId: string | undefined,
  episodeDetail: IEpisodeDetail | null,
  preferredUploaders: string[],
  trustedUploaders: string[],
  rawEpisodeMetadata: Omit<IEpisodeMetadata, 'episodeData'>,
  userImplementedFunctions: Partial<RawUserImplementedFunctions> | undefined,
  envVariable: EnvVariable | undefined,
  userData: IUserRelatedEnvVariable | undefined,
  getInjectedEpisodeMetadata:
  | ((x: IEpisodeMetadata) => IEpisodeMetadata | Promise<IEpisodeMetadata>)
  | undefined,
  navigate: ISeriesCoreConfig['navigate'],
) => {
  const fetchData = useDataFetcher();

  const normalizeEpisodeId = useEpisodeIdNormalizer();

  const getEpisodeMetadata = React.useCallback(
    async (nextEpisodeId: string): Promise<IEpisodeMetadata> => {
      const normalizedEpisodeId = normalizeEpisodeId(nextEpisodeId);
      const
        nextEpisodeDetail = (
          normalizedEpisodeId === episodeDetail?.key
          && episodeDetail.resources
          && episodeDetail.assets
        )
          ? episodeDetail
          : await fetchData(normalizedEpisodeId);

      const notInjectedEpisodeMetadata = {
        ...rawEpisodeMetadata,
        episodeData: {
          resources: nextEpisodeDetail.resources,
          assets: nextEpisodeDetail.assets,
          preferredUploaders,
          trustedUploaders,
        },
      };

      return getInjectedEpisodeMetadata?.(notInjectedEpisodeMetadata) ?? notInjectedEpisodeMetadata;
    },
    [
      episodeDetail,
      fetchData,
      normalizeEpisodeId,
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

  React.useEffect(() => {
    if (episodeId && episodeId !== seriesCore.currentEpisodeCore.get()?.episodeId) {
      seriesCore.setEpisode(episodeId, false);
    }
  }, [episodeId, seriesCore]);

  React.useEffect(() => {
    seriesCore.config.getEpisodeMetadata = getEpisodeMetadata;
  }, [getEpisodeMetadata, seriesCore.config]);

  React.useEffect(() => {
    seriesCore.config.navigate = navigate;
  }, [navigate, seriesCore.config]);

  React.useEffect(() => {
    if (userImplementedFunctions) {
      seriesCore.userImplementedFunction.set(userImplementedFunctions);
    }
  }, [seriesCore.userImplementedFunction, userImplementedFunctions]);

  React.useEffect(() => {
    if (envVariable) {
      seriesCore.envVariable.set(envVariable);
    }
  }, [envVariable, seriesCore.envVariable]);

  React.useEffect(() => {
    if (userData) {
      seriesCore.userData.set(userData);
    }
  }, [userData, seriesCore.userData]);

  const episodeCore = useStore(seriesCore.currentEpisodeCore);

  React.useEffect(() => {
    const episodeData = episodeCore?.getEpisodeData();

    if (episodeDetail?.assets && episodeDetail?.resources && episodeId) {
      const nextEpisodeData = {
        assets: episodeDetail.assets,
        resources: episodeDetail.resources,
        preferredUploaders,
        trustedUploaders,
      };

      if (!episodeData) {
        const initializedData = episodeCore?.initializeEpisode(nextEpisodeData);

        log(
          'Episode initialized',
          initializedData,
        );
      } else {
        logWarn(
          'Suppressed initialize',
          episodeData, '->',
          nextEpisodeData,
        );
      }
    }
  }, [
    episodeCore,
    episodeId,
    episodeDetail,
    trustedUploaders,
    preferredUploaders,
  ]);

  useEpisodeDetailReloadDiagnosisTool('episodeId', episodeId, episodeCore);
  useEpisodeDetailReloadDiagnosisTool('episodeDetail', episodeDetail, episodeCore);
  useEpisodeDetailReloadDiagnosisTool('trustedUploaders', trustedUploaders, episodeCore);
  useEpisodeDetailReloadDiagnosisTool('preferredUploaders', preferredUploaders, episodeCore);

  React.useEffect(() => {
    seriesCore.updateConfig({
      navigate,
      getEpisodeMetadata,
    });
  }, [navigate, getEpisodeMetadata, seriesCore]);

  return { episodeCore, seriesCore };
};
