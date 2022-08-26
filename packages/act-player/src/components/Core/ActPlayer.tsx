import * as React from 'react';
import debug from 'debug';

import useConstant from 'use-constant';
import { atom } from 'nanostores';
import { useStore } from '@nanostores/react';

import { Core } from '@recative/core-manager';
import {
  AssetForClient,
  IResourceItemForClient,
  RawUserImplementedFunctions,
} from '@recative/definitions';
import type {
  IInitialAssetStatus,
  IUserRelatedEnvVariable,
  IDefaultAdditionalEnvVariable,
  InternalEpisodeData,
} from '@recative/core-manager';

import { Block } from 'baseui/block';

import { useBugFreeStore } from '../../hooks/useBugFreeStore';
import { Loading } from '../Loading/Loading';
import { LoadingLayer } from '../Loading/LoadingLayer';
import { PanicLayer } from '../Panic/PanicLayer';
import { Subtitle } from '../Subtitle/Subtitle';
import { Controller } from '../Controller/Controller';
import { Dialog } from '../Dialog/Dialog';
import { Stage } from '../Stage/Stage';
import { InterfaceExtensionComponent } from '../../types/ExtensionCore';

const log = debug('player:core');

export type PlayerAssetProp = Omit<AssetForClient, 'duration'> & {
  duration: number | null;
};
export type PlayerResourceProp = IResourceItemForClient;

interface IInternalActPlayerProps<
  T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
> {
  coreRef?: React.MutableRefObject<Core<T> | null>;
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

const DEFAULT_INTERFACE_COMPONENTS = [
  LoadingLayer,
  Stage,
  Subtitle,
  Dialog,
  Controller({}),
  PanicLayer,
];

const FALSE_STORE = atom(false);

const InternalActPlayer = <
  T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
>(
    props: IInternalActPlayerProps<T>,
  ) => {
  const containerRef = React.useRef<HTMLDivElement>();
  const episodeInitialized = useConstant(() => ({ value: false }));
  const [episodeData, setEpisodeData] = React.useState<InternalEpisodeData | null>(null);

  const core = useConstant(() => {
    const manager = new Core<T>({
      initialEnvVariable: props.envVariable,
      initialAssetStatus: props.initialAsset,
      attemptAutoplay: !props.disableAutoPlay,
      episodeId: props.episodeId,
    });
    props.onInitialized?.();
    return { manager };
  });

  React.useImperativeHandle(props.coreRef, () => core.manager);

  const interfaceComponents = props.interfaceComponents ?? DEFAULT_INTERFACE_COMPONENTS;

  const fullScreen = useStore(core.manager.fullScreen);

  React.useLayoutEffect(() => {
    core.manager.setUserImplementedFunctions(
      props.userImplementedFunctions,
    );
  }, [props.userImplementedFunctions]);

  React.useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => event.preventDefault();

    return () => {
      containerRef.current?.removeEventListener(
        'contextmenu',
        handleContextMenu,
      );
    };
  }, []);

  const onEnd = React.useCallback(() => {
    props.onEnd?.();
  }, [props.onEnd]);

  React.useEffect(() => {
    core.manager.eventTarget.addEventListener('end', onEnd);
    return () => core.manager.eventTarget.removeEventListener('end', onEnd);
  }, [onEnd]);

  const onSegmentEnd = React.useCallback(
    (event: CustomEvent<number>) => {
      props.onSegmentEnd?.(event.detail);
    },
    [props.onSegmentEnd],
  );

  const onSegmentStart = React.useCallback(
    (event: CustomEvent<number>) => {
      props.onSegmentStart?.(event.detail);
    },
    [props.onSegmentStart],
  );

  React.useEffect(() => {
    core.manager.eventTarget.addEventListener(
      'segmentEnd',
      onSegmentEnd as EventListener,
    );
    return () => core.manager.eventTarget.removeEventListener(
      'segmentEnd',
      onSegmentEnd as EventListener,
    );
  }, [onSegmentEnd]);

  React.useEffect(() => {
    core.manager.eventTarget.addEventListener(
      'segmentStart',
      onSegmentStart as EventListener,
    );
    return () => core.manager.eventTarget.removeEventListener(
      'segmentStart',
      onSegmentStart as EventListener,
    );
  }, [onSegmentStart]);

  React.useEffect(() => {
    if (episodeInitialized.value) return;
    if (!props.assets || !props.resources) return;

    episodeInitialized.value = true;

    const nextEpisodeData = core.manager.initializeEpisode({
      assets: props.assets.map((asset) => ({
        ...asset,
        duration: asset.duration === null ? Infinity : asset.duration,
      })),
      resources: props.resources,
      preferredUploaders: props.preferredUploaders,
      trustedUploaders: props.trustedUploaders,
    });

    setEpisodeData(nextEpisodeData);
  }, [props.assets, props.resources]);

  const urlCached = useBugFreeStore(episodeData?.preloader.urlCached ?? FALSE_STORE);
  const blockingResourcesCached = useBugFreeStore(
    episodeData?.preloader.blockingResourceCached ?? FALSE_STORE,
  );

  const getCurrentFullscreenElement = () => {
    // Fuck you iOS.
    if ('webkitFullscreenElement' in document) {
      return (document as any).webkitFullscreenElement;
    }
    return document.fullscreenElement;
  };

  React.useEffect(() => {
    const enableFullScreen = core.manager.getUserImplementedFunctions()?.enableAppFullScreenMode;
    const disableFullScreen = core.manager.getUserImplementedFunctions()?.disableAppFullScreenMode;
    const currentFullscreenElement = getCurrentFullscreenElement();
    const $player = containerRef.current;
    if (!$player) {
      if (fullScreen) {
        core.manager.fullScreen.set(false);
      }
      return;
    }
    if (fullScreen) {
      if (enableFullScreen) {
        enableFullScreen();
        return;
      }
      if ($player === currentFullscreenElement) {
        return;
      }
      // Fuck you iOS.
      if ('webkitRequestFullscreen' in $player) {
        // @ts-ignore: Fuck you iOS.
        $player.webkitRequestFullscreen();
      } else {
        $player.requestFullscreen();
      }
    } else {
      if (disableFullScreen) {
        disableFullScreen();
        return;
      }
      if ($player !== currentFullscreenElement) {
        return;
      }
      if ('webkitExitFullscreen' in document) {
        // @ts-ignore: Fuck you iOS.
        document.webkitExitFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  }, [fullScreen]);

  const handleFullScreenChange = React.useCallback(() => {
    const currentFullscreenElement = getCurrentFullscreenElement();
    const $player = containerRef.current;
    core.manager.fullScreen.set(
      $player !== undefined && $player === currentFullscreenElement,
    );
  }, []);

  React.useEffect(() => {
    // Fuck you iOS.
    if ('onwebkitfullscreenchange' in document) {
      document.addEventListener(
        'webkitfullscreenchange',
        handleFullScreenChange,
      );
      return () => document.removeEventListener(
        'webkitfullscreenchange',
        handleFullScreenChange,
      );
    }
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, [handleFullScreenChange]);

  const lastDocumentHidden = React.useRef(document.hidden);
  const playingBeforeHiddenRef = React.useRef(false);
  const handleVisibilityChange = React.useCallback(() => {
    if (lastDocumentHidden.current === document.hidden) {
      return;
    }
    lastDocumentHidden.current = document.hidden;
    if (props.pauseWhenNotVisible ?? true) {
      if (document.hidden) {
        playingBeforeHiddenRef.current = core.manager.playing.get();
        core.manager.pause();
      } else if (playingBeforeHiddenRef.current) {
        core.manager.play();
      }
    }
  }, [props.pauseWhenNotVisible]);

  React.useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  React.useEffect(() => {
    if (props.userData) {
      core.manager.envVariableManager.userRelatedEnvVariableAtom.set(
        props.userData,
      );
    }
  }, [props.userData]);

  React.useEffect(() => {
    if (props.envVariable) {
      core.manager.additionalEnvVariable.set(props.envVariable);
    }
  }, [props.envVariable]);

  if (!urlCached || !blockingResourcesCached) {
    log(`Loading screen showed, reason: urlCached -> ${urlCached}, blockingResourcesCached -> ${blockingResourcesCached}`);
    const LoadingComponent = props.loadingComponent ?? Loading;

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
      {interfaceComponents.map((Component, index) => (
        <Component
          core={core.manager}
          key={index}
          loadingComponent={props.loadingComponent}
          {...props.interfaceComponentProps}
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
  return <InternalActPlayer<T> key={episodeId} {...props} episodeId={episodeId} />;
};

ActPlayer.whyDidYouRender = true;
