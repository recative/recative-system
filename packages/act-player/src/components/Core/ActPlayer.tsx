import * as React from 'react';

import useConstant from 'use-constant';
import { useStore } from '@nanostores/react';

import { EpisodeCore } from '@recative/core-manager';
import {
  IResourceItemForClient,
  RawUserImplementedFunctions,
} from '@recative/definitions';
import type {
  IInitialAssetStatus,
  IUserRelatedEnvVariable,
  IDefaultAdditionalEnvVariable,
} from '@recative/core-manager';

import { Block } from 'baseui/block';

import { useFullScreen } from './hooks/useFullScreen';
import { useLoadingStatus } from './hooks/useLoadingStatus';
import { useCustomEventWrapper } from './hooks/useCustomEventWrapper';
import { useEnvVariableHandler } from './hooks/useEnvVariableHandler';
import { usePageVisibilityHandler } from './hooks/usePageVisibilityHandler';
import { useContextMenuRemovalHandler } from './hooks/useContextMenuRemovalHandler';

import type { PlayerAssetProp } from './hooks/useEpisodeInitializer';

import { Stage } from '../Stage/Stage';
import { Dialog } from '../Dialog/Dialog';
import { Loading } from '../Loading/Loading';
import { Subtitle } from '../Subtitle/Subtitle';
import { Controller } from '../Controller/Controller';
import { PanicLayer } from '../Panic/PanicLayer';
import { LoadingLayer } from '../Loading/LoadingLayer';
import { InterfaceExtensionComponent } from '../../types/ExtensionCore';

import { useEpisodeInitializer } from './hooks/useEpisodeInitializer';

export type PlayerResourceProp = IResourceItemForClient;

interface IInternalUnmanagedActPlayerProps<
  T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
> {
  coreRef?: React.MutableRefObject<EpisodeCore<T> | null>;
  episodeId: string;
  interfaceComponents?: InterfaceExtensionComponent[];
  interfaceComponentProps?: Record<string, unknown>;
  assets: PlayerAssetProp[];
  resources: IResourceItemForClient[];
  preferredUploaders: string[];
  trustedUploaders: string[];
  userData: IUserRelatedEnvVariable | undefined;
  envVariable: T;
  initialAsset?: IInitialAssetStatus;
  userImplementedFunctions: Partial<RawUserImplementedFunctions>;
  disableAutoPlay?: boolean;
  pauseWhenNotVisible?: boolean;
  loadingComponent?: React.FC;
  onEnd?: () => void;
  onSegmentEnd?: (segment: number) => void;
  onSegmentStart?: (segment: number) => void;
  onInitialized?: () => void;
}

export const ManagedPlayerProps = [
  'episodeId',
  'assets',
  'resources',
  'userData',
  'envVariable',
  'preferredUploaders',
  'trustedUploaders',
  'initialAsset',
  'userImplementedFunctions',
  'disableAutoPlay',
  'onEnd',
  'onSegmentEnd',
  'onSegmentStart',
  'onInitialized',
] as const;

export interface IInternalManagedActPlayerProps<
  T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
> extends Omit<IInternalUnmanagedActPlayerProps<T>,
  (typeof ManagedPlayerProps)[number]
  > {
  core: EpisodeCore<T>;
}

const DEFAULT_INTERFACE_COMPONENTS = [
  LoadingLayer,
  Stage,
  Subtitle,
  Dialog,
  Controller({}),
  PanicLayer,
];

export const InternalManagedActPlayer = <
  T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
>(
    {
      core,
      coreRef,
      interfaceComponents,
      interfaceComponentProps,
      pauseWhenNotVisible,
      loadingComponent,
    }: IInternalManagedActPlayerProps<T>,
  ) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useImperativeHandle(coreRef, () => core);

  const internalInterfaceComponents = interfaceComponents ?? DEFAULT_INTERFACE_COMPONENTS;

  const fullScreen = useStore(core.fullScreen);
  useFullScreen(fullScreen, core, containerRef);

  useContextMenuRemovalHandler(containerRef);

  usePageVisibilityHandler(!!pauseWhenNotVisible, core);

  const playerLoading = useLoadingStatus(core);

  if (playerLoading) {
    const LoadingComponent = loadingComponent ?? Loading;

    return (
      <Block
        ref={containerRef}
        position="relative"
        width="100%"
        height="100%"
        overflow="hidden"
      >
        <LoadingComponent />
      </Block>
    );
  }

  return (
    // <React.StrictMode>
    <Block
      ref={containerRef}
      position="relative"
      width="100%"
      height="100%"
      overflow="hidden"
    >
      {internalInterfaceComponents.map((Component, index) => (
        <Component
          core={core}
          key={index}
          loadingComponent={loadingComponent}
          {...interfaceComponentProps}
        />
      ))}
    </Block>
    // </React.StrictMode>
  );
};

const InternalUnmanagedActPlayer = <
  T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
>(
    {
      coreRef,
      episodeId,
      interfaceComponents,
      interfaceComponentProps,
      assets,
      resources,
      preferredUploaders,
      trustedUploaders,
      userData,
      envVariable,
      initialAsset,
      userImplementedFunctions,
      disableAutoPlay,
      pauseWhenNotVisible,
      loadingComponent,
      onEnd,
      onSegmentEnd,
      onSegmentStart,
      onInitialized,
    }: IInternalUnmanagedActPlayerProps<T>,
  ) => {
  const core = useConstant(() => {
    const manager = new EpisodeCore<T>({
      initialEnvVariable: envVariable,
      initialAssetStatus: initialAsset,
      attemptAutoplay: !disableAutoPlay,
      episodeId,
    });
    onInitialized?.();

    return { manager };
  });

  useEpisodeInitializer(
    assets,
    resources,
    preferredUploaders,
    trustedUploaders,
    core.manager,
  );

  useEnvVariableHandler(userData, envVariable, core.manager);

  useCustomEventWrapper(onEnd, 'end', core.manager);
  useCustomEventWrapper(onSegmentEnd, 'segmentEnd', core.manager);
  useCustomEventWrapper(onSegmentStart, 'segmentStart', core.manager);

  React.useLayoutEffect(() => {
    core.manager.setUserImplementedFunctions(
      userImplementedFunctions,
    );
  }, [core.manager, userImplementedFunctions]);

  return (
    <InternalManagedActPlayer<T>
      core={core.manager}
      coreRef={coreRef}
      interfaceComponents={interfaceComponents}
      interfaceComponentProps={interfaceComponentProps}
      pauseWhenNotVisible={pauseWhenNotVisible}
      loadingComponent={loadingComponent}
    />
  );
};

export interface IUnmanagedActPointProps<
  T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
> extends IInternalUnmanagedActPlayerProps<T> {
  episodeId: string;
}

export interface IManagedActPointProps<
  T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
> extends IInternalManagedActPlayerProps<T> {
}

export const ActPlayer = <
  T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
>(props: IUnmanagedActPointProps<T> | IManagedActPointProps<T>) => {
  if ('core' in props) {
    return <InternalManagedActPlayer<T> key={props.core.episodeId} {...props} />;
  }

  return (
    <InternalUnmanagedActPlayer<T>
      key={props.episodeId}
      {...props}
    />
  );
};
