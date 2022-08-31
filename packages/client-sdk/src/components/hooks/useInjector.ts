import * as React from 'react';
import debug from 'debug';

import type {
  SeriesCore,
  EpisodeCore,
  IEpisodeMetadata,
  IDefaultAdditionalEnvVariable,
  SegmentEndEventDetail,
  SegmentStartEventDetail,
} from '@recative/core-manager';
import type { IManagedActPointProps } from '@recative/act-player';
import type { RawUserImplementedFunctions } from '@recative/definitions';

import { useDataFetcher } from './useDataFetcher';

import type { IContentProps } from '../Content';

import { useEpisodeDetail } from '../../external';

const log = debug('client:injector');

export interface InjectedProps<PlayerPropsInjectedDependencies> {
  episodeId?: string;
  dependencies: PlayerPropsInjectedDependencies;
  coreRef: React.RefObject<EpisodeCore>;
  userImplementedFunctions: Partial<RawUserImplementedFunctions> | undefined;
}

const ON_END: IContentProps<unknown, unknown>['onEnd'] = () => log('[DEFAULT] All content ended');
const ON_SEGMENT_END: IContentProps<unknown, unknown>['onSegmentEnd'] = ({ episodeId, segment }: SegmentEndEventDetail) => log(`[DEFAULT] Segment ${segment} of ${episodeId} ended`);
const ON_SEGMENT_START: IContentProps<unknown, unknown>['onSegmentStart'] = ({ episodeId, segment }: SegmentStartEventDetail) => log(`[DEFAULT] Segment ${segment} of ${episodeId} ended`);

export type PlayerPropsInjectorHook<PlayerPropsInjectedDependencies, EnvVariable> = (
  props: InjectedProps<PlayerPropsInjectedDependencies>
) => {
  episodeId?: string;
  injectToPlayer?: Partial<IManagedActPointProps>;
  injectToSdk?: Partial<IContentProps<EnvVariable, PlayerPropsInjectedDependencies>>;
  injectToContainer?: Record<string, unknown>;
  getEpisodeMetadata?: (x: IEpisodeMetadata) => IEpisodeMetadata;
};

// This could be any!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const usePlayerPropsDefaultHook: PlayerPropsInjectorHook<any, any> = () => ({
  injectToSdk: {
    onEnd: ON_END,
    onSegmentEnd: ON_SEGMENT_END,
    onSegmentStart: ON_SEGMENT_START,
  },
  injectToPlayer: undefined,
  injectToContainer: undefined,
  injectToEpisodeMetadata: undefined,
});

/**
 * Garbage in garbage out.
 */
export const useInjector = <
    PlayerPropsInjectedDependencies,
    EnvVariable extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable,
  >(
    episodeId: string | null,
    internalUsePlayerPropsHook:
    PlayerPropsInjectorHook<PlayerPropsInjectedDependencies, EnvVariable> | undefined,
    playerPropsHookDependencies: PlayerPropsInjectedDependencies,
    userImplementedFunctions: Partial<RawUserImplementedFunctions> | undefined,
    seriesCoreRef: React.MutableRefObject<SeriesCore<EnvVariable> | undefined>,
  ) => {
  const seriesCore = seriesCoreRef.current;
  const episodeCore = seriesCore?.currentEpisodeCore.get();

  type EpisodeCoreType = EpisodeCore<EnvVariable> | null;

  const episodeCoreRef = React.useRef<EpisodeCoreType>(null);

  React.useImperativeHandle<EpisodeCoreType, EpisodeCoreType>(
    episodeCoreRef,
    () => episodeCore ?? null,
    [episodeCore],
  );

  if (
    playerPropsHookDependencies
    && (
      typeof playerPropsHookDependencies !== 'object'
        || playerPropsHookDependencies === null
    )
  ) {
    throw new TypeError('Invalid player property hooks dependencies');
  }

  const usePlayerProps: PlayerPropsInjectorHook<
  PlayerPropsInjectedDependencies, EnvVariable
  > = internalUsePlayerPropsHook ?? usePlayerPropsDefaultHook;

  const envVariable = seriesCore?.envVariable.get();

  const episodeDetail = useEpisodeDetail(episodeId);

  const fetchData = useDataFetcher();

  const playerPropsHookProps = React.useMemo(
    () => ({
      dependencies: { ...playerPropsHookDependencies, fetchData },
      coreRef: episodeCoreRef,
      userImplementedFunctions,
      episodeId: episodeCore?.episodeId,
      envVariable,
      assets: episodeDetail?.assets,
    }),
    [
      playerPropsHookDependencies,
      fetchData,
      userImplementedFunctions,
      episodeCore?.episodeId,
      envVariable,
      episodeDetail?.assets,
    ],
  );

  const {
    injectToSdk,
    injectToPlayer,
    injectToContainer,
    getEpisodeMetadata,
  } = usePlayerProps(playerPropsHookProps);

  const {
    hookOnEnd, hookOnSegmentEnd, hookOnSegmentStart, hookInjectToSdk,
  } = React.useMemo(() => {
    const {
      onEnd: hookOnEnd0,
      onSegmentEnd: hookOnSegmentEnd0,
      onSegmentStart: hookOnSegmentStart0,
      ...injectToSdk0
    } = injectToSdk ?? {};

    return {
      hookOnEnd: hookOnEnd0,
      hookOnSegmentEnd: hookOnSegmentEnd0,
      hookOnSegmentStart: hookOnSegmentStart0,
      hookInjectToSdk: injectToSdk0,
    };
  }, [injectToSdk]);

  React.useEffect(() => {
    log('Episode #', episodeId);
    log('Episode Detail', episodeDetail);
    log('Props for hook', playerPropsHookProps);
    log('Injected SDK props', hookInjectToSdk);
  }, [episodeDetail, episodeId, hookInjectToSdk, playerPropsHookProps]);

  return {
    hookOnEnd,
    hookOnSegmentEnd,
    hookOnSegmentStart,
    injectToSdk: hookInjectToSdk,
    injectToContainer,
    injectToPlayer,
    getEpisodeMetadata,
  };
};
