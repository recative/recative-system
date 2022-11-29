import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import * as app from '@capacitor/app';

import { useDataFetcher } from '@recative/client-sdk';

import { Block } from 'baseui/block';
import {
  useSdkConfig,
  useEpisodeDetail,
  ContentModuleFactory,
} from '@recative/client-sdk';

import { preferredUploaders, trustedUploaders } from './constants/configurations';

import { useEnvVariable } from './hooks/useEnvVariable';

export const InternalPlayer: React.FC = () => {
  const navigate = useNavigate();
  const config = useSdkConfig();

  const { episodeId } = useParams<{ episodeId: string }>();
  if (!episodeId) throw new Error('Episode ID not exists');

  const fetchData = useDataFetcher();

  const handleEpisodeIdUpdate = React.useCallback(async (
    id: string, forceReload?: boolean,
  ) => {
    const url = `/episode/${id}`;
    if (forceReload) {
      window.location.href = url;
    } else {
      navigate(url);
    }
  }, [navigate]);

  const episodeDetail = useEpisodeDetail(episodeId);

  const dependencies = React.useMemo(
    () => ({
      navigate,
      app,
      fetchData,
    }),
    [fetchData, navigate]
  );

  const envVariable = useEnvVariable(episodeDetail);

  const Content = React.useMemo(
    () => ContentModuleFactory(config.pathPattern, config.dataType),
    [config.pathPattern, config.dataType]
  );

  return (
    <Block
      top='0'
      left='0'
      width='100vw'
      height='100vh'
      position='absolute'
    >
      <React.Suspense fallback={null}>
        <Content
          episodeId={episodeId}
          envVariable={envVariable}
          userData={undefined}
          preferredUploaders={preferredUploaders}
          trustedUploaders={trustedUploaders}
          playerPropsHookDependencies={dependencies}
          onEpisodeIdUpdate={handleEpisodeIdUpdate}
        />
      </React.Suspense>
    </Block>
  );
};

export const Player = React.memo(InternalPlayer);
