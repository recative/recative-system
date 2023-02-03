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
import { Inspector } from './Inspector';

export type PlayerResourceProp = IResourceItemForClient;

export interface IInternalManagedActPlayerProps<
  T extends Record<string, unknown>,
> {
  core: EpisodeCore<T>;
  coreRef?: React.MutableRefObject<EpisodeCore<T> | null>;
  interfaceComponents?: InterfaceExtensionComponent[];
  interfaceComponentProps?: Record<string, unknown>;
  pauseWhenNotVisible?: boolean;
  loadingComponent?: React.FC;
}

interface IInternalUnmanagedActPlayerProps<
  T extends Record<string, unknown>,
> extends Omit<IInternalManagedActPlayerProps<T>, 'core'> {
  episodeId: string;
  assets: PlayerAssetProp[];
  resources: IResourceItemForClient[];
  userData: IUserRelatedEnvVariable | undefined;
  envVariable: T;
  preferredUploaders: string[];
  trustedUploaders: string[];
  initialAsset?: IInitialAssetStatus;
  userImplementedFunctions: Partial<RawUserImplementedFunctions>;
  disableAutoPlay?: boolean;
  onEnd?: () => void;
  onSegmentEnd?: (segment: number) => void;
  onSegmentStart?: (segment: number) => void;
  onInitialized?: () => void;
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
  T extends Record<string, unknown>,
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
        id="recative-act-player--early-return"
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
      <Inspector core={core} />
    </Block>
    // </React.StrictMode>
  );
};

const InternalUnmanagedActPlayer = <
  T extends Record<string, unknown>,
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
  T extends Record<string, unknown>,
> extends IInternalUnmanagedActPlayerProps<T> {
  episodeId: string;
}

export interface IManagedActPointProps<
  T extends Record<string, unknown>,
> extends IInternalManagedActPlayerProps<T> {
}

export const ActPlayer = <
  Managed extends boolean,
  T extends Record<string, unknown>,
>(props: Managed extends true ? IManagedActPointProps<T> : IUnmanagedActPointProps<T>) => {
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
