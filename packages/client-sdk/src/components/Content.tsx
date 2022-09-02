import * as React from 'react';
import debug from 'debug';

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
import { useWrappedOnEpisodeUpdate } from './hooks/useWrappedOnEpisodeIdUpdate';

import type { PlayerPropsInjectorHook } from './hooks/useInjector';

import { loadCustomizedModule } from '../utils/loadCustomizedModule';

import { useSdkConfig } from '../hooks/useSdkConfig';
import { useEpisodeDetail } from '../hooks/useEpisodeDetail';
import { useMemoryLeakFixer } from '../hooks/useMemoryLeakFixer';
import { useResetAssetStatusCallback } from '../hooks/useResetAssetStatusCallback';

import { CONTAINER_COMPONENT } from '../constant/storageKeys';

const error = debug('sdk:content:error');
// This is on purpose
// eslint-disable-next-line no-console
error.log = console.error.bind(console);

export interface IContentProps<
  PlayerPropsInjectedDependencies,
  EnvVariable extends Record<string, unknown>,
> {
  episodeId: string | undefined;
  userImplementedFunctions?: Partial<RawUserImplementedFunctions>;
  preferredUploaders: string[];
  trustedUploaders: string[];
  envVariable: EnvVariable | undefined;
  userData: IUserRelatedEnvVariable | undefined;
  LoadingComponent?: React.FC;
  initialAsset?: IEpisodeMetadata['initialAssetStatus'];
  attemptAutoplay?: IEpisodeMetadata['attemptAutoplay'];
  defaultContentLanguage?: IEpisodeMetadata['defaultContentLanguage'];
  defaultSubtitleLanguage?: IEpisodeMetadata['defaultSubtitleLanguage'];
  playerPropsHookDependencies: PlayerPropsInjectedDependencies;
  onEpisodeIdUpdate: ISeriesCoreConfig['navigate'],
  onEnd?: (x: EndEventDetail) => void;
  onSegmentEnd?: (x: SegmentEndEventDetail) => void;
  onSegmentStart?: (x: SegmentStartEventDetail) => void;
  onInitialized?: (x: InitializedEventDetail) => void;
}

const FULL_WIDTH_STYLE = { width: '100%', height: '100%' };

const DefaultContainerComponent: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  // eslint-disable-next-line react/forbid-dom-props
  <div className="demoContainer" style={FULL_WIDTH_STYLE}>
    {children}
  </div>
);

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
      episodeId,
      envVariable,
      userData,
      initialAsset,
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

      const injectedUserImplementedFunctions = React.useMemo<
      Partial<RawUserImplementedFunctions>
      >(() => ({
        ...userImplementedFunctions,
        gotoEpisode: (_, nextEpisodeId, forceReload, assetOrder, assetTime) => {
          if (!seriesCoreRef.current) {
            throw new TypeError('Series core is not initialized, this is not allowed');
          }

          seriesCoreRef.current.setEpisode(nextEpisodeId, forceReload, assetOrder, assetTime);
        },
      }), [userImplementedFunctions]);

      const wrappedOnEpisodeIdUpdate = useWrappedOnEpisodeUpdate(onEpisodeIdUpdate);

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
        envVariable,
        userData,
        internalUsePlayerPropsHook,
        playerPropsHookDependencies,
        injectedUserImplementedFunctions,
        seriesCoreRef,
      );

      const episodeDetail = useEpisodeDetail(episodeId ?? null);

      const rawEpisodeMetadata = React.useMemo(() => ({
        initialAssetStatus: injectToSdk?.initialAsset ?? initialAsset,
        attemptAutoplay: injectToSdk?.attemptAutoplay ?? attemptAutoplay,
        defaultContentLanguage: injectToSdk?.defaultContentLanguage ?? defaultContentLanguage,
        defaultSubtitleLanguage: injectToSdk?.defaultSubtitleLanguage,
      }), [
        attemptAutoplay,
        defaultContentLanguage,
        initialAsset,
        injectToSdk?.attemptAutoplay,
        injectToSdk?.defaultContentLanguage,
        injectToSdk?.defaultSubtitleLanguage,
        injectToSdk?.initialAsset,
      ]);

      const { episodeCore, seriesCore } = useSeriesCore<EnvVariable>(
        episodeId,
        episodeDetail,
        preferredUploaders,
        trustedUploaders,
        rawEpisodeMetadata,
        hookUserImplementedFunctions,
        hookEnvVariable ?? envVariable,
        hookUserData ?? userData,
        getInjectedEpisodeMetadata,
        wrappedOnEpisodeIdUpdate,
      );
      React.useImperativeHandle(seriesCoreRef, () => seriesCore, [seriesCore]);

      const resetInitialAsset = useResetAssetStatusCallback();

      useCustomEventWrapper(playerOnEnd, hookOnEnd, 'end', seriesCore);
      useCustomEventWrapper(playerOnSegmentEnd, hookOnSegmentEnd, 'segmentEnd', seriesCore);
      useCustomEventWrapper(playerOnSegmentStart, hookOnSegmentStart, 'segmentStart', seriesCore);
      useCustomEventWrapper(resetInitialAsset, playerOnInitialized, 'initialized', seriesCore);

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
          episodeId={episodeDetail?.episode.id || ''}
          episodes={config.episodesMap}
          {...props}
          {...injectToContainer}
        >
          {
            playerReady ? (
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
