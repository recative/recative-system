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

interface IInternalActPlayerProps<
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
  'preferredUploaders',
  'trustedUploaders',
  'userData',
  'envVariable',
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
> extends Omit<IInternalActPlayerProps<T>,
  (typeof ManagedPlayerProps)[number]
  > {}

const DEFAULT_INTERFACE_COMPONENTS = [
  LoadingLayer,
  Stage,
  Subtitle,
  Dialog,
  Controller({}),
  PanicLayer,
];

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
    }: IInternalActPlayerProps<T>,
  ) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

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

  React.useImperativeHandle(coreRef, () => core.manager);

  const { playerLoading } = useEpisodeInitializer(
    assets,
    resources,
    preferredUploaders,
    trustedUploaders,
    core.manager,
  );

  const internalInterfaceComponents = interfaceComponents ?? DEFAULT_INTERFACE_COMPONENTS;

  const fullScreen = useStore(core.manager.fullScreen);
  useFullScreen(fullScreen, core.manager, containerRef);

  useContextMenuRemovalHandler(containerRef);

  React.useLayoutEffect(() => {
    core.manager.setUserImplementedFunctions(
      userImplementedFunctions,
    );
  }, [core.manager, userImplementedFunctions]);

  useCustomEventWrapper(onEnd, 'end', core.manager);
  useCustomEventWrapper(onSegmentEnd, 'segmentEnd', core.manager);
  useCustomEventWrapper(onSegmentStart, 'segmentStart', core.manager);

  usePageVisibilityHandler(!!pauseWhenNotVisible, core.manager);
  useEnvVariableHandler(userData, envVariable, core.manager);

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
          core={core.manager}
          key={index}
          loadingComponent={loadingComponent}
          {...interfaceComponentProps}
        />
      ))}
    </Block>
    // </React.StrictMode>
  );
};

export interface IActPointProps<
  T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
> extends IInternalActPlayerProps<T> {
  episodeId: string;
}

export const ActPlayer = <
  T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
>({
    episodeId,
    ...props
  }: IActPointProps<T>) => {
  return <InternalUnmanagedActPlayer<T> key={episodeId} {...props} episodeId={episodeId} />;
};
