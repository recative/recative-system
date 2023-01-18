import * as React from 'react';
import debug from 'debug';
import { atom } from 'nanostores';
import { useStore } from '@nanostores/react';

import { ActPlayer, InterfaceExtensionComponent } from '@recative/act-player';
import {
  SeriesCore,
  EndEventDetail,
  SegmentEndEventDetail,
  InitializedEventDetail,
  SegmentStartEventDetail,
  IUserRelatedEnvVariable,
} from '@recative/core-manager';

import type { RawUserImplementedFunctions } from '@recative/definitions';
import type {
  IEpisodeMetadata,
  ISeriesCoreConfig,
} from '@recative/core-manager';

import { useInjector } from './hooks/useInjector';
import { useSeriesCore } from './hooks/useSeriesCore';
import { useCustomEventWrapper } from './hooks/useCustomEventWrapper';

import type { PlayerPropsInjectorHook } from './hooks/useInjector';

import { loadCustomizedModule } from '../utils/loadCustomizedModule';

import { useSdkConfig } from '../hooks/useSdkConfig';
import { useEpisodeDetail } from '../hooks/useEpisodeDetail';
import { useMemoryLeakFixer } from '../hooks/useMemoryLeakFixer';
import { useResetAssetStatusCallback } from '../hooks/useResetAssetStatusCallback';

import { useDataFetcher } from './hooks/useDataFetcher';
import { CONTAINER_COMPONENT } from '../constant/storageKeys';
import { useEpisodeIdNormalizer } from './hooks/useEpisodeIdNormalizer';
import { useDiagnosisInformation } from '../hooks/useDiagnosisInformation';

const error = debug('sdk:content:error');
// This is on purpose
// eslint-disable-next-line no-console
error.log = console.error.bind(console);

const VOID_ATOM = atom('void' as const);

export interface IContentProps<
  PlayerPropsInjectedDependencies,
  EnvVariable extends Record<string, unknown>,
> {
  /**
   * The identity of the episode.
   */
  episodeId: string | undefined;
  /**
   * Platform specific methods for the interaction program, like episode
   * switching or payment.
   */
  userImplementedFunctions?: Partial<RawUserImplementedFunctions>;
  /**
   * The priority of URL selection.
   */
  preferredUploaders: string[];
  /**
   * The uploaders which do not need to be checked for availability. If the file
   * is stored locally, like for the Electron Client, Android or iOS client,
   * developers could pass the uploader id here, which can boost the resource
   * loading performance.
   */
  trustedUploaders: string[];
  /**
   * Additional environmental variables which is shared among the whole system
   * including the interactive program.
   */
  envVariable: EnvVariable | undefined;
  /**
   * Part of the environmental variable, but provided a stronger type definition
   * to make sure the typing of these important information are correct.
   */
  userData: IUserRelatedEnvVariable | undefined;
  /**
   * The React component of the loading indicator, used for provided a 
   * remarkable branding identity, if not provided, will use the default one.
   */
  LoadingComponent?: React.FC;
  /**
   * If attempt to enable the autoplay feature, please notice we will give the 
   * best effort, but some strict browser media playback strategy (like Safari)
   * may make the autoplay fail.
   */
  attemptAutoplay?: IEpisodeMetadata['attemptAutoplay'];
  /**
   * The initial language of the content if the user has not selected the
   * language to be used.
   */
  defaultContentLanguage?: IEpisodeMetadata['defaultContentLanguage'];
  /**
   * The initial language of the subtitle, since the language of the video and
   * the language of the subtitle could be different, the configuration is
   * separated.
   */
  defaultSubtitleLanguage?: IEpisodeMetadata['defaultSubtitleLanguage'];
  /**
   * Native dependencies for user implemented interface components and the
   * `containerComponent`.
   */
  playerPropsHookDependencies: PlayerPropsInjectedDependencies;
  /**
   * A callback which will be called when the episode id was changed.
   */
  onEpisodeIdUpdate: ISeriesCoreConfig['navigate'],
  /**
   * The callback which will be called when the episode playback is finished.
   * @param x The event detail that contains the episode id.
   */
  onEnd?: (x: EndEventDetail) => void;
  /**
   * The callback which will be called when each segment (like act program or
   * video) finished its playback.
   * @param x The event detail that contains the episode id and segment order.
   */
  onSegmentEnd?: (x: SegmentEndEventDetail) => void;
  /**
   * The callback which will be called when any segment start playing.
   * @param x The event detail that contains the episode id and segment order.
   */
  onSegmentStart?: (x: SegmentStartEventDetail) => void;
  /**
   * The callback which will be called when the whole episode has finished its
   * initialization task.
   * @param x The event detail that contains the episode id.
   */
  onInitialized?: (x: InitializedEventDetail) => void;
}

const FULL_WIDTH_STYLE = { width: '100%', height: '100%' };

const DefaultContainerComponent: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  // eslint-disable-next-line react/forbid-dom-props
  <div className="demoContainer" style={FULL_WIDTH_STYLE}>
    {children}
  </div>
);

const hostSearchParameters: Record<string, string> = {};

if (typeof window !== 'undefined') {
  new URLSearchParams(window.location.search).forEach((value, key) => {
    hostSearchParameters[key] = value;
  });
}

const DefaultContainerModule = {
  Container: DefaultContainerComponent,
};
export interface IContentModule<
  PlayerPropsInjectedDependencies,
  EnvVariable extends Record<string, unknown>,
> {
  Container?: React.FC<React.PropsWithChildren>;
  interfaceComponents?: InterfaceExtensionComponent[];
  usePlayerProps?: PlayerPropsInjectorHook<PlayerPropsInjectedDependencies, EnvVariable>;
}

/**
 * A factory component which could produce a React component that manage series-
 * level content playback.
 * @param pathPattern The pattern of the episode definition files generated by
 *        the Recative Studio. This field contains two pattern that can be
 *        replaced with the configuration:
 *        - **`$fileName`:** The name of the file or episode, extension name is
 *          not included.
 *        - **`$dataType`:** The type of the data, could be:
 *          * **`json`:** Literally json.
 *          * **`bson`:** Binary file which could be parsed with [MessagePack](https://msgpack.org/).
 *          * **`uson`:** A private format, similar to `JSON` but compressed
 *            with the value index, the compression ratio is smaller than
 *            MessagePack, but the parsing speed is faster, suitable for the
 *            use case for the mobile platform. The underlying library is [`@recative/ugly-json`](/api/ugly-json).
 *       
 * @param dataType The type of the data.
 * @param baseUrl A string representing the base URL to use in cases where url
 *        is a relative URL.
 * @returns 
 */
export const ContentModuleFactory = <
  PlayerPropsInjectedDependencies,
  EnvVariable extends Record<string, unknown>,
>(
  pathPattern: string,
  dataType: string,
  baseUrl = '',
) => React.lazy(async () => {
  const debugContainerComponents = localStorage.getItem(CONTAINER_COMPONENT);

  const containerModule = await (async () => {
    try {
      return (await loadCustomizedModule(
        debugContainerComponents || 'containerComponents.js',
        pathPattern,
        dataType,
        debugContainerComponents ? null : baseUrl,
      )) as IContentModule<PlayerPropsInjectedDependencies, EnvVariable>;
    } catch (e) {
      error('Failed to load customized module!', e);
      return DefaultContainerModule as IContentModule<
        PlayerPropsInjectedDependencies, EnvVariable
      >;
    }
  })();

  const {
    usePlayerProps: internalUsePlayerPropsHook,
    Container,
    interfaceComponents,
  } = containerModule;

  const ContainerComponent: React.FC<
    React.PropsWithChildren<Record<string, unknown>>
  > = Container || DefaultContainerComponent;

  type ContentProps = IContentProps<PlayerPropsInjectedDependencies, EnvVariable>;

  const Content = ({
    children,
    episodeId: rawEpisodeId,
    envVariable,
    userData,
    LoadingComponent,
    preferredUploaders,
    trustedUploaders,
    userImplementedFunctions,
    playerPropsHookDependencies,
    onEpisodeIdUpdate,
    attemptAutoplay,
    defaultContentLanguage,
    defaultSubtitleLanguage,
    onEnd: playerOnEnd,
    onSegmentEnd: playerOnSegmentEnd,
    onSegmentStart: playerOnSegmentStart,
    onInitialized: playerOnInitialized,
    ...props
  }: React.PropsWithChildren<ContentProps>) => {
    useMemoryLeakFixer();

    const config = useSdkConfig();
    const seriesCoreRef = React.useRef<SeriesCore<EnvVariable>>();
    const normalizeEpisodeId = useEpisodeIdNormalizer();

    const episodeId = React.useMemo(
      () => {
        try {
          return normalizeEpisodeId(rawEpisodeId);
        } catch (e) {
          return undefined;
        }
      },
      [normalizeEpisodeId, rawEpisodeId],
    );

    const episodeDetail = useEpisodeDetail(episodeId ?? null);

    const dataFetcher = useDataFetcher();

    const diagnosisInformation = useDiagnosisInformation();

    const injectedEnvVariable = React.useMemo(() => ({
      episodeId,
      assets: episodeDetail?.assets,
      episode: episodeDetail?.episode,
      hostSearchParameters,
      diagnosisInformation,
      ...envVariable,
    } as unknown as EnvVariable), [
      episodeId,
      episodeDetail?.assets,
      episodeDetail?.episode,
      diagnosisInformation,
      envVariable
    ]);

    const injectedUserImplementedFunctions = React.useMemo<
      Partial<RawUserImplementedFunctions>
    >(() => ({
      ...userImplementedFunctions,
      dataFetcher,
      gotoEpisode: (_, nextEpisodeId, forceReload, assetOrder, assetTime) => {
        if (!seriesCoreRef.current) {
          throw new TypeError('Series core is not initialized, this is not allowed');
        }

        const normalizedEpisodeId = normalizeEpisodeId(nextEpisodeId);

        if (normalizeEpisodeId === undefined) {
          throw new TypeError(`Unable to normalize the episode id ${nextEpisodeId}`);
        }

        seriesCoreRef.current.setEpisode(
          normalizedEpisodeId || '',
          forceReload,
          assetOrder,
          assetTime,
        );
      },
    }), [dataFetcher, normalizeEpisodeId, userImplementedFunctions]);

    const {
      hookOnEnd,
      hookOnSegmentEnd,
      hookOnSegmentStart,
      hookUserImplementedFunctions,
      hookEnvVariable,
      hookUserData,
      injectToSdk,
      injectToContainer,
      injectToPlayer,
      getEpisodeMetadata: getInjectedEpisodeMetadata,
    } = useInjector<PlayerPropsInjectedDependencies, EnvVariable>(
      episodeId ?? null,
      preferredUploaders,
      trustedUploaders,
      injectedEnvVariable,
      userData,
      episodeDetail,
      internalUsePlayerPropsHook,
      playerPropsHookDependencies,
      injectedUserImplementedFunctions,
      onEpisodeIdUpdate,
      seriesCoreRef,
    );

    const injectedEpisodeMetadata = React.useMemo(() => ({
      attemptAutoplay: injectToSdk?.attemptAutoplay ?? attemptAutoplay,
      defaultContentLanguage: injectToSdk?.defaultContentLanguage ?? defaultContentLanguage,
      defaultSubtitleLanguage: injectToSdk?.defaultSubtitleLanguage ?? defaultSubtitleLanguage,
    }), [
      attemptAutoplay,
      defaultContentLanguage,
      defaultSubtitleLanguage,
      injectToSdk?.attemptAutoplay,
      injectToSdk?.defaultContentLanguage,
      injectToSdk?.defaultSubtitleLanguage,
    ]);

    const { episodeCore, seriesCore } = useSeriesCore<EnvVariable>(
      episodeId,
      episodeDetail,
      injectToSdk?.preferredUploaders ?? preferredUploaders,
      injectToSdk?.trustedUploaders ?? trustedUploaders,
      injectedEpisodeMetadata,
      hookUserImplementedFunctions ?? injectedUserImplementedFunctions,
      hookEnvVariable ?? injectedEnvVariable,
      hookUserData ?? userData,
      getInjectedEpisodeMetadata,
      onEpisodeIdUpdate,
    );
    React.useImperativeHandle(seriesCoreRef, () => seriesCore, [seriesCore]);

    const resetInitialAsset = useResetAssetStatusCallback();

    useCustomEventWrapper(playerOnEnd, hookOnEnd, 'end', seriesCore);
    useCustomEventWrapper(playerOnSegmentEnd, hookOnSegmentEnd, 'segmentEnd', seriesCore);
    useCustomEventWrapper(playerOnSegmentStart, hookOnSegmentStart, 'segmentStart', seriesCore);
    useCustomEventWrapper(resetInitialAsset, playerOnInitialized, 'initialized', seriesCore);

    const coreState = useStore(episodeCore?.coreState ?? VOID_ATOM);
    const playerReady = episodeDetail
      && episodeCore
      && episodeDetail.assets
      && episodeId;

    const loadingElement = LoadingComponent
      ? <div id="recative-client-sdk--early-return"><LoadingComponent /></div>
      : <div />;

    return (
      <ContainerComponent
        episodeCore={episodeCore}
        seriesCore={seriesCore}
        episodeListRequestStatus={config.requestStatus.episodes}
        episodeDetailRequestStatus={
          episodeId && config.requestStatus[episodeId]
        }
        // We must use episode id from episodeCore but not from the router or
        // the episodeDetail, this is a problem of lifecycle, only id in
        // episode id changed means the episode core ready, and we can
        // initialize the episode safely.
        episodeId={episodeCore?.episodeId || ''}
        episodes={config.episodesMap}
        {...props}
        {...injectToContainer}
      >
        {
          playerReady && coreState !== 'destroyed'
            ? (
              <ActPlayer<true, EnvVariable>
                core={episodeCore}
                interfaceComponents={interfaceComponents}
                loadingComponent={LoadingComponent}
                {...injectToPlayer}
              />
            )
            : loadingElement
        }
      </ContainerComponent>
    );
  };

  return {
    default: Content as React.FC<ContentProps>,
  };
});
