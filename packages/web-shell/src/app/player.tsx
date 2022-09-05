import * as React from 'react';
import { debug } from 'debug';

import { useParams, useNavigate } from 'react-router-dom';
import {
  useSdkConfig,
  useEpisodeDetail,
  ContentModuleFactory,
} from '@recative/client-sdk';

import type { SegmentEndEventDetail } from '@recative/core-manager';

import { Block } from 'baseui/block';

import { NaiveStore } from './utils/NaiveStore';
import { useEnvVariable } from './hooks/useEnvVariable';
import {
  trustedUploaders,
  preferredUploaders,
} from './constants/configurations';

const log = debug('web-shell:player');

// This is actually not secure on web platform, we name it as secure to keep
// compatibility with the mobile platform
const SECURE_STORE = new NaiveStore();

const InternalPlayer: React.FC = () => {
  const navigate = useNavigate();
  const config = useSdkConfig();

  const { episodeId } = useParams<{ episodeId: string }>();
  if (!episodeId) throw new Error('Episode ID not exists');

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
      secureStore: SECURE_STORE,
    }),
    [navigate],
  );

  const envVariable = useEnvVariable(episodeDetail);

  const Content = React.useMemo(
    () => ContentModuleFactory(config.pathPattern, config.dataType),
    [config.pathPattern, config.dataType],
  );

  const handleEpisodeEnd = React.useCallback(() => {
    log('Episode end');
    // Call finish episode here
  }, []);

  const handleSegmentEnd = React.useCallback(
    (x: SegmentEndEventDetail) => {
      log(`Segment ${x.segment} end`);

      if (!episodeDetail) {
        log('Unable to mark segment as finished, episode detail not exists');
        return;
      }

      const asset = episodeDetail?.assets[x.segment];

      if (asset) {
        // call unlock asset here
      } else {
        log('Unable to mark segment as finished, asset not exists');
      }
    },
    [episodeDetail],
  );

  return (
    <Block
      top="0"
      left="0"
      width="100vw"
      height="100vh"
      position="absolute"
    >
      <React.Suspense fallback={null}>
        <Content
          episodeId={episodeId}
          envVariable={envVariable}
          userData={undefined}
          preferredUploaders={preferredUploaders}
          trustedUploaders={trustedUploaders}
          playerPropsHookDependencies={dependencies}
          onEnd={handleEpisodeEnd}
          onSegmentEnd={handleSegmentEnd}
          onEpisodeIdUpdate={handleEpisodeIdUpdate}
        />
      </React.Suspense>
    </Block>
  );
};

export const Player = React.memo(InternalPlayer);
