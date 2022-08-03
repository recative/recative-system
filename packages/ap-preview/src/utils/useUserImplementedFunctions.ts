/* eslint-disable no-alert */
/* eslint-disable import/no-extraneous-dependencies */

import * as React from 'react';
import { atom } from 'nanostores';
import { debug } from 'debug';

import { useNavigate } from 'react-router-dom';

import { useEpisodes } from '@recative/client-sdk';
import { IInitialAssetStatus } from '@recative/core-manager';
import type { UserImplementedFunctions } from '@recative/definitions';

const log = debug('example:user-impl-fn');

export const INITIAL_ASSET_STATUS_ATOM = atom<IInitialAssetStatus | undefined>();

export const useUserImplementedFunctions = (episodeId: string | undefined) => {
  const navigate = useNavigate();
  const episodes = useEpisodes();

  const gotoEpisode: UserImplementedFunctions['gotoEpisode'] = React.useCallback(
    (seek, episodeOrder, forceReload, assetOrder, assetTime) => {
      const episode = [...episodes.values()].find(
        (x) => x.order.toString() === episodeOrder,
      );
      if (!episode) {
        log('Episode not found');
        return;
      }

      if (episodeId === episode.id.toString()) {
        if (assetOrder !== undefined && assetTime !== undefined) {
          seek(assetOrder, assetTime);
        }

        log('Same episode, seeking');
        return;
      }

      if (assetOrder !== undefined && assetTime !== undefined) {
        INITIAL_ASSET_STATUS_ATOM.set({
          time: assetTime,
          order: assetOrder,
        });
      } else {
        INITIAL_ASSET_STATUS_ATOM.set(undefined);
      }

      const nextUrl = `/episode/${episode.id}`;
      log(`Will navigate to ${nextUrl}`);
      if (!forceReload) {
        navigate(nextUrl);
      } else {
        window.location.href = nextUrl;
      }
    },
    [navigate, episodes],
  );

  return React.useMemo(() => ({ gotoEpisode }), [gotoEpisode]);
};
