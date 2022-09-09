import * as React from 'react';
import debug from 'debug';

import { atom } from 'nanostores';
import { useStore } from '@nanostores/react';

import type {
  SeriesCore,
  EpisodeCore,
  IDefaultAdditionalEnvVariable,
  SegmentEndEventDetail,
  SegmentStartEventDetail,
  IUserRelatedEnvVariable,
  IEpisodeMetadata,
  ISeriesCoreConfig,
} from '@recative/core-manager';
import type { IManagedActPointProps } from '@recative/act-player';
import type { RawUserImplementedFunctions } from '@recative/definitions';

import type { IEpisodeDetail } from '../../external';
import type { IContentProps } from '../Content';

import { useEpisodeIdNormalizer } from './useEpisodeIdNormalizer';
import { useDataFetcher } from './useDataFetcher';

const log = debug('client:injector');

const logGroup = debug('client:injector');
// eslint-disable-next-line no-console
logGroup.log = console.groupCollapsed.bind(console);
// eslint-disable-next-line no-console
const endLogGroup = console.groupEnd;

export interface InjectedProps<
  PlayerPropsInjectedDependencies,
  EnvVariable extends Record<string, unknown>,
> {
  episodeId?: string;
  seriesCore: SeriesCore<EnvVariable> | null;
  episodeCore: EpisodeCore<EnvVariable> | null;
  preferredUploaders: string[];
  trustedUploaders: string[];
  envVariable: EnvVariable | undefined;
  userData: IUserRelatedEnvVariable | undefined;
  dependencies: PlayerPropsInjectedDependencies;
  userImplementedFunctions: Partial<RawUserImplementedFunctions> | undefined;
}

type UnknownRecord = Record<string, unknown>;

const ON_END: IContentProps<unknown, UnknownRecord>['onEnd'] = () => log('[DEFAULT] All content ended');
const ON_SEGMENT_END: IContentProps<unknown, UnknownRecord>['onSegmentEnd'] = ({ episodeId, segment }: SegmentEndEventDetail) => log(`[DEFAULT] Segment ${segment} of ${episodeId} ended`);
const ON_SEGMENT_START: IContentProps<unknown, UnknownRecord>['onSegmentStart'] = ({ episodeId, segment }: SegmentStartEventDetail) => log(`[DEFAULT] Segment ${segment} of ${episodeId} ended`);

export type PlayerPropsInjectorHook<
  PlayerPropsInjectedDependencies,
  EnvVariable extends Record<string, unknown>,
> = (
  props: InjectedProps<PlayerPropsInjectedDependencies, EnvVariable>
) => {
  episodeId?: string;
  injectToPlayer?: Partial<IManagedActPointProps<EnvVariable>>;
  injectToSdk?: Partial<IContentProps<PlayerPropsInjectedDependencies, EnvVariable>>;
  injectToContainer?: Record<string, unknown>;
  getEpisodeMetadata?:
  | ((episodeId: string, episodeMetadata: IEpisodeMetadata) => (
    | IEpisodeMetadata
    | Promise<IEpisodeMetadata>
    | undefined
    | Promise<undefined>
  ))
  | undefined;
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

const NULL_ATOM = atom(null);

/**
 * Garbage in garbage out.
 */
export const useInjector = <
    PlayerPropsInjectedDependencies,
    EnvVariable extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable,
  >(
    episodeId: string | null,
    preferredUploaders: string[],
    trustedUploaders: string[],
    envVariable: EnvVariable | undefined,
    userData: IUserRelatedEnvVariable | undefined,
    episodeDetail: IEpisodeDetail | null,
    internalUsePlayerPropsHook:
    PlayerPropsInjectorHook<PlayerPropsInjectedDependencies, EnvVariable> | undefined,
    playerPropsHookDependencies: PlayerPropsInjectedDependencies,
    userImplementedFunctions: Partial<RawUserImplementedFunctions> | undefined,
    navigate: ISeriesCoreConfig['navigate'],
    seriesCoreRef: React.MutableRefObject<SeriesCore<EnvVariable> | undefined>,
  ) => {
  const seriesCore = seriesCoreRef.current;
  const episodeCore = useStore(seriesCore?.currentEpisodeCore ?? NULL_ATOM);

  const fetchData = useDataFetcher();

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

  const normalizeEpisodeId = useEpisodeIdNormalizer();

  const internalDependencies = React.useMemo(() => ({
    navigate,
    fetchData,
    ...playerPropsHookDependencies,
  }), [fetchData, navigate, playerPropsHookDependencies]);

  const playerPropsHookProps = React.useMemo(
    () => ({
      episodeId: normalizeEpisodeId(episodeCore?.episodeId),
      preferredUploaders,
      trustedUploaders,
      envVariable,
      userData,
      seriesCore: seriesCore ?? null,
      episodeCore: episodeCore ?? null,
      dependencies: internalDependencies,
      userImplementedFunctions,
    }),
    [
      normalizeEpisodeId,
      episodeCore,
      preferredUploaders,
      trustedUploaders,
      envVariable,
      userData,
      seriesCore,
      internalDependencies,
      userImplementedFunctions,
    ],
  );

  const {
    injectToSdk,
    injectToPlayer,
    injectToContainer,
    getEpisodeMetadata,
  } = usePlayerProps(playerPropsHookProps);

  const {
    hookOnEnd,
    hookOnSegmentEnd,
    hookOnSegmentStart,
    hookInjectToSdk,
    hookUserImplementedFunctions,
    hookEnvVariable,
    hookUserData,
  } = React.useMemo(() => {
    const {
      onEnd: hookOnEnd0,
      onSegmentEnd: hookOnSegmentEnd0,
      onSegmentStart: hookOnSegmentStart0,
      userImplementedFunctions: hookUserImplementedFunctions0,
      envVariable: envVariable0,
      userData: userData0,
      ...injectToSdk0
    } = injectToSdk ?? {};

    return {
      hookOnEnd: hookOnEnd0,
      hookOnSegmentEnd: hookOnSegmentEnd0,
      hookOnSegmentStart: hookOnSegmentStart0,
      hookUserImplementedFunctions: hookUserImplementedFunctions0,
      hookInjectToSdk: injectToSdk0,
      hookEnvVariable: envVariable0,
      hookUserData: userData0,
    };
  }, [injectToSdk]);

  React.useEffect(() => {
    logGroup('Injected parameters changed');
    logGroup('Episode:');
    log('#:', episodeId);
    log('Detail', episodeDetail);
    endLogGroup();
    logGroup('Injection:');
    log('In:', playerPropsHookProps);
    logGroup('Out:');
    log('-> SDK:', injectToSdk);
    log('-> Player:', injectToPlayer);
    log('-> Container:', injectToContainer);
    endLogGroup();
    endLogGroup();
    endLogGroup();
  }, [
    episodeId,
    episodeDetail,
    injectToSdk,
    injectToPlayer,
    injectToContainer,
    playerPropsHookProps,
  ]);

  return {
    hookOnEnd,
    hookOnSegmentEnd,
    hookOnSegmentStart,
    hookUserImplementedFunctions,
    injectToSdk: hookInjectToSdk,
    hookEnvVariable,
    hookUserData,
    injectToContainer,
    injectToPlayer,
    getEpisodeMetadata,
  };
};
