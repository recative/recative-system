/* eslint-disable @typescript-eslint/comma-dangle */
import * as React from 'react';
import debug from 'debug';

import { ActPlayer } from '@recative/act-player';
import type { IActPointProps } from '@recative/act-player';
import type { UserImplementedFunctions } from '@recative/definitions';
import type { Core, IInitialAssetStatus } from '@recative/core-manager';

import { fetch } from '../utils/fetch';
import { loadCustomizedModule } from '../utils/loadCustomizedModule';

import { useSdkConfig } from '../hooks/useSdkConfig';
import { useEpisodeDetail } from '../hooks/useEpisodeDetail';
import { useMemoryLeakFixer } from '../hooks/useMemoryLeakFixer';
import { useResetAssetStatusCallback } from '../hooks/useResetAssetStatusCallback';

import { CONTAINER_COMPONENT } from '../constant/storageKeys';

const log = debug('client:content-sdk');

const ON_END = () => log('[DEFAULT] All content ended');
const ON_SEGMENT_END = (segment: number) => log(`[DEFAULT] Segment ${segment} ended`);
const ON_SEGMENT_START = (segment: number) => log(`[DEFAULT] Segment ${segment} started`);

const usePlayerPropsDefaultHook = () => ({
  injectToPlayer: {
    onEnd: ON_END,
    onSegmentEnd: ON_SEGMENT_END,
    onSegmentStart: ON_SEGMENT_START,
  },
  injectToContainer: undefined,
});

const DefaultContainerComponent: React.FC = ({ children }) => (
  <div className="demoContainer" style={{ width: '100%', height: '100%' }}>
    {children}
  </div>
);

const DefaultContainerModule = {
  Container: DefaultContainerComponent,
};

interface IContentModule<PlayerPropsInjectedDependencies> {
  Container?: React.FC<any>;
  interfaceComponents?: React.FC<any>[];
  usePlayerProps?: (props: {
    episodeId?: string;
    dependencies: PlayerPropsInjectedDependencies;
    coreRef: React.RefObject<Core>;
    userImplementedFunctions: Partial<UserImplementedFunctions> | undefined;
  }) => {
    injectToPlayer?: Partial<IActPointProps>;
    injectToContainer?: Record<string, unknown>;
  };
}

export interface IContentProps<EnvVariable> {
  episodeId: string | undefined;
  initialAsset: IInitialAssetStatus | undefined;
  userImplementedFunctions: Partial<UserImplementedFunctions> | undefined;
  preferredUploaders: string[];
  trustedUploaders: string[];
  envVariable: EnvVariable | undefined;
  loadingComponent?: React.FC<{}>;
  playerPropsHookDependencies?: any;
  onEnd?: () => void;
  onSegmentEnd?: (segment: number) => void;
  onSegmentStart?: (segment: number) => void;
  onInitialized?: () => void;
}

export const ContentModuleFactory = <
  EnvVariable extends Record<string, unknown>,
  ContentModule
>(
    pathPattern: string,
    dataType: string,
    baseUrl = '',
  ) => React.lazy(async () => {
    const containerModule = await (async () => {
      try {
        return (await loadCustomizedModule(
          localStorage.getItem(CONTAINER_COMPONENT) ?? 'containerComponents.js',
          pathPattern,
          dataType,
          baseUrl,
        )) as IContentModule<ContentModule>;
      } catch (e) {
        console.warn('Failed to load customized module!');
        console.error(e);
        return DefaultContainerModule as IContentModule<ContentModule>;
      }
    })();

    const {
      usePlayerProps: internalUsePlayerProps,
      Container,
      interfaceComponents,
    } = containerModule;
    const ContainerComponent: React.FC<any> = Container || DefaultContainerComponent;
    const usePlayerProps = internalUsePlayerProps ?? usePlayerPropsDefaultHook;

    const Content = ({
      children,
      episodeId,
      envVariable,
      initialAsset,
      loadingComponent,
      preferredUploaders,
      trustedUploaders,
      userImplementedFunctions,
      playerPropsHookDependencies,
      onEnd: playerOnEnd,
      onSegmentEnd: playerOnSegmentEnd,
      onSegmentStart: playerOnSegmentStart,
      onInitialized: playerOnInitialized,
      ...props
    }: React.PropsWithChildren<IContentProps<EnvVariable>>) => {
      const config = useSdkConfig();
      const coreRef = React.useRef<Core<EnvVariable>>(null);

      useMemoryLeakFixer();

      const episodeDetail = useEpisodeDetail(episodeId ?? null);

      const { pathPattern, dataType, setClientSdkConfig } = useSdkConfig();

      const fetchData = React.useCallback(
        (fileName: string) => fetch(fileName, dataType, pathPattern, setClientSdkConfig),
        [dataType, pathPattern, setClientSdkConfig]
      );

      const playerPropsHookProps = React.useMemo(
        () => ({
          dependencies: { ...playerPropsHookDependencies, fetchData },
          coreRef,
          userImplementedFunctions,
          episodeId,
          envVariable,
          assets: episodeDetail?.assets,
        }),
        [
          playerPropsHookDependencies,
          userImplementedFunctions,
          episodeId,
          envVariable,
          episodeDetail,
          fetchData,
        ]
      );

      const { injectToPlayer, injectToContainer } = usePlayerProps(playerPropsHookProps);

      const {
        hookOnEnd, hookOnSegmentEnd, hookOnSegmentStart, playerProps
      } = React.useMemo(() => {
        const {
          onEnd: hookOnEnd0,
          onSegmentEnd: hookOnSegmentEnd0,
          onSegmentStart: hookOnSegmentStart0,
          ...playerProps0
        } = injectToPlayer ?? {};

        return {
          hookOnEnd: hookOnEnd0,
          hookOnSegmentEnd: hookOnSegmentEnd0,
          hookOnSegmentStart: hookOnSegmentStart0,
          playerProps: playerProps0,
        };
      }, [injectToPlayer]);

      React.useEffect(() => {
        log('Episode #', episodeId);
        log('Episode Detail', episodeDetail);
        log('Props for hook', playerPropsHookProps);
        log('Injected player props', playerProps);
      }, [playerProps]);

      const onEnd = React.useCallback(() => {
        playerOnEnd?.();
        hookOnEnd?.();
      }, [hookOnEnd, playerOnEnd]);

      const onSegmentEnd = React.useCallback(
        (segment: number) => {
          playerOnSegmentEnd?.(segment);
          hookOnSegmentEnd?.(segment);
        },
        [hookOnSegmentEnd, playerOnSegmentEnd]
      );

      const onSegmentStart = React.useCallback(
        (segment: number) => {
          playerOnSegmentStart?.(segment);
          hookOnSegmentStart?.(segment);
        },
        [hookOnSegmentStart, playerOnSegmentStart]
      );

      const resetInitialAsset = useResetAssetStatusCallback();
      const onInitialized = React.useCallback(() => {
        resetInitialAsset();
        playerOnInitialized?.();
      }, [playerOnInitialized, resetInitialAsset]);

      return (
        <ContainerComponent
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
            episodeDetail
            && episodeDetail.assets
            && userImplementedFunctions
            && episodeId
              ? (
                <ActPlayer<EnvVariable>
                  coreRef={coreRef as any}
                  episodeId={episodeDetail.episode.id || ''}
                  assets={episodeDetail.assets}
                  resources={episodeDetail.resources}
                  preferredUploaders={preferredUploaders}
                  trustedUploaders={trustedUploaders}
                  initialAsset={initialAsset || config.initialAssetStatus}
                  userImplementedFunctions={userImplementedFunctions}
                  interfaceComponents={interfaceComponents}
                  userData={undefined}
                  envVariable={envVariable as any}
                  onEnd={onEnd}
                  onSegmentEnd={onSegmentEnd}
                  onSegmentStart={onSegmentStart}
                  onInitialized={onInitialized}
                  loadingComponent={loadingComponent}
                  {...playerProps}
                />
              )
              : (
                loadingComponent ?? <div />
              )
          }
        </ContainerComponent>
      );
    };

    return {
      default: Content as React.FC<IContentProps<EnvVariable>>,
    };
  });
