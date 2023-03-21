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
import { useInjectedParameterDiagnosisTool } from './useInjectedParameterDiagnosisTool';

const log = debug('client:injector');

const logGroup = debug('client:injector');
// eslint-disable-next-line no-console
logGroup.log = console.groupCollapsed.bind(console);

/**
 * Interface representing the parameter to a React hook, which will be
 * injected to multiple places.
 * @template PlayerPropsInjectedDependencies - an object providing platform
 *           specific dependencies to the hooks.
 * @template EnvVariable - a variable that contains the metadata related to the
 *           client.
 */
export interface IInjectedProps<
  PlayerPropsInjectedDependencies,
  EnvVariable extends Record<string, unknown>
> {
  /**
   * An optional string representing the ID of the episode.
   */
  episodeId?: string;
  /**
   * An object representing the series core used to control the series level
   * playback tasks.
   */
  seriesCore: SeriesCore<EnvVariable> | null;
  /**
   * An object representing the episode core used to control the episode level
   * playback tasks.
   */
  episodeCore: EpisodeCore<EnvVariable> | null;
  /**
   * An array of string representing the IDs of the preferred uploaders to be
   * used to fetch resources.
   */
  preferredUploaders: string[];
  /**
   * An array of string representing the IDs of the trusted uploaders, whose
   * resources are always be treated as available.
   */
  trustedUploaders: string[];
  /**
   * An object containing the metadata related to the client.
   */
  envVariable: EnvVariable | undefined;
  /**
   * An object containing information about the user token, avatar and nickname.
   */
  userData: IUserRelatedEnvVariable | undefined;
  /**
   * An object providing platform specific dependencies to the hooks.
   */
  dependencies: PlayerPropsInjectedDependencies;
  /**
   * An object containing user implemented functions to customize the behavior
   * of the player.
   */
  userImplementedFunctions: Partial<RawUserImplementedFunctions> | undefined;
}

type UnknownRecord = Record<string, unknown>;

const ON_END: IContentProps<unknown, UnknownRecord>['onEnd'] = () =>
  log('[DEFAULT] All content ended');
const ON_SEGMENT_END: IContentProps<unknown, UnknownRecord>['onSegmentEnd'] = ({
  episodeId,
  segment,
}: SegmentEndEventDetail) =>
  log(`[DEFAULT] Segment ${segment} of ${episodeId} ended`);
const ON_SEGMENT_START: IContentProps<
  unknown,
  UnknownRecord
>['onSegmentStart'] = ({ episodeId, segment }: SegmentStartEventDetail) =>
  log(`[DEFAULT] Segment ${segment} of ${episodeId} ended`);

/**
 * This interface defines the properties that can be injected to different parts
 * of the application.
 * It is used as the return type of a React hook.
 *
 * @template PlayerPropsInjectedDependencies - Dependencies injected to
 *           the `ManagedActPlayer` component of the `@recative/act-player`
 *           package
 * @template EnvVariable - Environment variables injected to client-sdk
 *           configuration
 */
export interface IInjectorProps<
  PlayerPropsInjectedDependencies,
  EnvVariable extends Record<string, unknown>
> {
  /**
   * ID of the episode to inject the properties.
   */
  episodeId?: string;

  /**
   * Partial properties to inject to the ManagedActPlayer component.
   */
  injectToPlayer?: Partial<IManagedActPointProps<EnvVariable>>;

  /**
   * Partial properties to inject to the client-sdk configuration.
   * Please notice only these properties will take effect: `attemptAutoplay`,
   * `defaultContentLanguage`, `defaultSubtitleLanguage`, `preferredUploaders`,
   * `trustedUploaders`.
   */
  injectToSdk?: Partial<
    IContentProps<PlayerPropsInjectedDependencies, EnvVariable>
  >;

  /**
   * Properties to inject to the container component.
   */
  injectToContainer?: Record<string, unknown>;

  /**
   * A function to modify the metadata of the episode.
   *
   * @param episodeId - ID of the episode to modify the metadata.
   * @param episodeMetadata - Metadata of the episode to modify.
   *
   * @returns The modified metadata, or undefined if no modification is needed.
   */
  getEpisodeMetadata?: (
    episodeId: string,
    episodeMetadata: IEpisodeMetadata
  ) =>
    | IEpisodeMetadata
    | Promise<IEpisodeMetadata>
    | undefined
    | Promise<undefined>;
}

export type PlayerPropsInjectorHook<
  PlayerPropsInjectedDependencies,
  EnvVariable extends Record<string, unknown>
> = (
  props: IInjectedProps<PlayerPropsInjectedDependencies, EnvVariable>
) => IInjectorProps<PlayerPropsInjectedDependencies, EnvVariable>;

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
  EnvVariable extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable
>(
  episodeId: string | null,
  preferredUploaders: string[],
  trustedUploaders: string[],
  envVariable: EnvVariable | undefined,
  userData: IUserRelatedEnvVariable | undefined,
  episodeDetail: IEpisodeDetail | null,
  internalUsePlayerPropsHook:
    | PlayerPropsInjectorHook<PlayerPropsInjectedDependencies, EnvVariable>
    | undefined,
  playerPropsHookDependencies: PlayerPropsInjectedDependencies,
  userImplementedFunctions: Partial<RawUserImplementedFunctions> | undefined,
  navigate: ISeriesCoreConfig['navigate'],
  seriesCoreRef: React.MutableRefObject<SeriesCore<EnvVariable> | undefined>
) => {
  const seriesCore = seriesCoreRef.current;
  const episodeCore = useStore(seriesCore?.currentEpisodeCore ?? NULL_ATOM);

  const fetchData = useDataFetcher();

  if (
    playerPropsHookDependencies &&
    (typeof playerPropsHookDependencies !== 'object' ||
      playerPropsHookDependencies === null)
  ) {
    throw new TypeError('Invalid player property hooks dependencies');
  }

  const usePlayerProps: PlayerPropsInjectorHook<
    PlayerPropsInjectedDependencies,
    EnvVariable
  > = internalUsePlayerPropsHook ?? usePlayerPropsDefaultHook;

  const normalizeEpisodeId = useEpisodeIdNormalizer();

  const internalDependencies = React.useMemo(
    () => ({
      navigate,
      fetchData,
      normalizeEpisodeId,
      ...playerPropsHookDependencies,
    }),
    [fetchData, navigate, playerPropsHookDependencies, normalizeEpisodeId]
  );

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
    ]
  );

  const { injectToSdk, injectToPlayer, injectToContainer, getEpisodeMetadata } =
    usePlayerProps(playerPropsHookProps);

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

  useInjectedParameterDiagnosisTool(
    episodeId,
    episodeDetail,
    injectToSdk,
    injectToPlayer,
    injectToContainer,
    playerPropsHookProps
  );

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
