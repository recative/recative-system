/* eslint-disable no-await-in-loop */
/* eslint-disable no-constant-condition */
import * as React from 'react';
import cn from 'classnames';
import debug from 'debug';

import useConstant from 'use-constant';
import { useStore } from '@nanostores/react';
import { useStyletron } from 'baseui';
import { useAsync, useThrottledCallback } from '@react-hookz/web';

import { getApManager } from '@recative/ap-manager';
import { ResolutionMode } from '@recative/definitions';

import { Block } from 'baseui/block';

import { Error } from '../Panic/Error';
import { Loading } from '../Loading/Loading';
import { ModuleContainer } from '../Layout/ModuleContainer';
import type { AssetExtensionComponent } from '../../types/ExtensionCore';

import { getController } from './actPointControllers';

const apManager = getApManager(3);

const logError = debug('player:ap-component');
// eslint-disable-next-line no-console
logError.log = console.error.bind(console);

const FULL_SIZE_STYLES = {
  width: '100%',
  height: '100%',
} as const;

const VISIBLE_STYLES = {
  backgroundColor: 'black',
} as const;

const RESET_POSITION_STYLES = {
  position: 'relative' as const,
} as const;

const IFRAME_STYLES = {
  pointerEvents: 'auto',
  borderWidth: 0,
} as const;

const SIZE_LIMIT_MAP = new Map<number, [number, number]>();

SIZE_LIMIT_MAP.set(1, [1280, 720]);
SIZE_LIMIT_MAP.set(2, [1920, 1080]);
SIZE_LIMIT_MAP.set(3, [Infinity, Infinity]);

const computedLimitedActPointRatio = (
  tier: unknown,
  element: HTMLDivElement | null
) => {
  if (!element) {
    return 1;
  }

  const tierLimit = SIZE_LIMIT_MAP.get(tier as number);

  if (!tierLimit) {
    return 1;
  }

  const { clientWidth, clientHeight } = element;
  const clientBox = [
    clientWidth * window.devicePixelRatio,
    clientHeight * window.devicePixelRatio
  ] as const;

  return Math.min(
    1,
    Math.max(...tierLimit) / Math.max(...clientBox),
    Math.min(...tierLimit) / Math.min(...clientBox),
  )
};

export const InternalActPoint: AssetExtensionComponent = React.memo((props) => {
  const [css] = useStyletron();
  const [scale, setScale] = React.useState(1);
  const [iFrameWidth, setIFrameWidth] = React.useState(-1);
  const [iFrameHeight, setIFrameHeight] = React.useState(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const iFrameContainerRef = React.useRef<HTMLDivElement>(null);
  const videoComponentInitialized = React.useRef(false);

  const resolution = useStore(props.core.resolution);
  const width: number | undefined = resolution?.width;
  const height: number | undefined = resolution?.height;

  const envVariable = useStore(props.core.envVariableManager.envVariableAtom);

  const updateActPointScale = useThrottledCallback(
    () => {
      if (!containerRef.current) return;
      if (width === undefined || height === undefined) {
        return;
      }

      const $container = containerRef.current;
      const specResolution = props.spec.resolutionMode as ResolutionMode;
      const resolutionMode = specResolution ?? ResolutionMode.FollowPlayerSetting;

      if (resolutionMode === ResolutionMode.FixedSize) {
        setIFrameWidth(props.spec.width as number);
        setIFrameHeight(props.spec.height as number);
      } else if (resolutionMode === ResolutionMode.FollowWindowSize) {
        setIFrameWidth(-1);
        setIFrameHeight(-1);
      } else {
        setIFrameWidth(width === undefined ? -1 : width);
        setIFrameHeight(height === undefined ? -1 : height);
      }

      if (
        resolutionMode === ResolutionMode.FixedSize
        || resolutionMode === ResolutionMode.FollowPlayerSetting
        || (
          resolutionMode === ResolutionMode.FollowWindowSize
          && (envVariable?.tier === 3 || !envVariable?.tier)
        )
      ) {
        const actPointRatio = iFrameWidth / iFrameHeight;

        const containerRatio = $container.clientWidth / $container.clientHeight;

        const nextScale = actPointRatio < containerRatio
          ? $container.clientHeight / iFrameHeight
          : $container.clientWidth / iFrameWidth;

        setScale(nextScale);
      } else {
        const actPointRatio = computedLimitedActPointRatio(
          envVariable.tier,
          containerRef.current,
        );

        const { clientWidth, clientHeight } = $container;

        setScale(1 / actPointRatio);
        setIFrameWidth(actPointRatio * clientWidth);
        setIFrameHeight(actPointRatio * clientHeight);
      };
    },
    [iFrameWidth, iFrameHeight, containerRef.current],
    100,
  );

  const iFrameSizeStyleDefinition = React.useMemo(() => {
    if (iFrameWidth === -1 && iFrameHeight === -1) {
      return {
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        height: '100%',
        width: '100%',
        position: 'absolute' as const,
      };
    }

    return {
      top: '50%',
      left: '50%',
      marginLeft: `-${iFrameWidth / 2}px`,
      marginTop: `-${iFrameHeight / 2}px`,
      position: 'absolute' as const,
      transform: `scale(${scale})`,
    };
  }, [iFrameHeight, iFrameWidth, scale]);

  React.useEffect(() => {
    window.addEventListener('resize', updateActPointScale);

    return () => window.removeEventListener('resize', updateActPointScale);
  }, [updateActPointScale]);

  React.useEffect(() => {
    setTimeout(updateActPointScale, 0);
  }, [width, height, props.show, updateActPointScale]);

  const iFrameStyles = css(IFRAME_STYLES);
  const visibleStyles = css(VISIBLE_STYLES);
  const fullSizeStyles = css(FULL_SIZE_STYLES);
  const iFrameSizeStyles = css(iFrameSizeStyleDefinition);
  const resetPositionStyles = css(RESET_POSITION_STYLES);

  const core = useConstant(() => {
    const controller = getController(props.id);

    const coreFunctions = props.core.registerComponent(
      props.id,
      controller.controller,
    );

    controller.setCoreFunctions(coreFunctions);

    return { controller, coreFunctions, destroyConnector: controller.destroyConnector };
  });

  const episodeData = props.core.getEpisodeData()!;

  const [{ result, error }, srcActions] = useAsync(async () => {
    const apEntryPoint = await episodeData.resources.getResourceById('@RECATIVE_AP');

    if (!apEntryPoint) throw new TypeError(`AP entry point not found`);

    const formattedSrc = new URL(apEntryPoint, window.location.href);
    const currentPage = new URL(window.location.href);

    currentPage.searchParams.forEach((value, key) => {
      return formattedSrc.searchParams.set(key, value);
    });

    const finalSrc = formattedSrc.toString();

    const apManagerSource = apManager.setupSource(
      apEntryPoint,
      Reflect.get(window, 'constant') ?? {}
    );
    const apInstance = apManagerSource.getInstance();

    iFrameContainerRef.current?.append(apInstance.iFrame);

    return { src: finalSrc, iFrame: apInstance.iFrame }
  });

  React.useLayoutEffect(() => {
    if (result) {
      result.iFrame.className = cn(iFrameStyles, iFrameSizeStyles);
    }
  }, [iFrameSizeStyles, iFrameStyles, result]);

  React.useLayoutEffect(() => {
    if (result) {
      result.iFrame.width = iFrameWidth.toString();
      result.iFrame.height = iFrameHeight.toString();
    }
  }, [iFrameHeight, iFrameWidth, result]);

  React.useLayoutEffect(() => {
    if (result) {
      result.iFrame.hidden = !props.show;
    }
  }, [iFrameSizeStyles, iFrameStyles, props.show, result]);

  React.useEffect(() => {
    srcActions.execute();
  }, [srcActions]);

  const handleEmergencyMessage = React.useCallback((event: MessageEvent) => {
    core.coreFunctions.log(`Emergency message received: ${event.data}`);

    if (event.data === 'ap-sw-not-available') {
      props.core.panicCode.set('Service Worker not Available');
    }

    if (event.data === 'ap-sw-register-error') {
      props.core.panicCode.set('Unable to Initialize the Service Worker');
    }

    if (event.data === 'ap-script-load-error') {
      props.core.panicCode.set('Unable to Load the Script');
    }
  }, [core.coreFunctions, props.core.panicCode]);

  React.useEffect(() => {
    return () => {
      core.destroyConnector();
    };
  }, [core]);

  React.useLayoutEffect(() => {
    if (videoComponentInitialized.current) return;
    if (!result?.src) return;

    const $iFrame = result?.iFrame;
    if (!$iFrame) return;

    const messageChannel = new MessageChannel();
    messageChannel.port1.addEventListener('message', handleEmergencyMessage);

    $iFrame.contentWindow!.postMessage('ap-emergency-channel', '*', [
      messageChannel.port2,
    ]);

    videoComponentInitialized.current = true;

    core.controller.setActPointTag($iFrame);

    return () => {
      core.controller.removeActPointTag();
      messageChannel.port1.removeEventListener(
        'message',
        handleEmergencyMessage,
      );
      messageChannel.port1.close();
    };
  }, [core.controller, handleEmergencyMessage, result?.iFrame, result?.src]);

  React.useEffect(() => {
    core.coreFunctions.updateContentState('preloading');

    return () => props.core.unregisterComponent(props.id);
  }, [core.coreFunctions, props.core, props.id]);

  const LoadingComponent = props.loadingComponent ?? Loading;

  const loading = props.show ? <LoadingComponent /> : null;

  const blockStyle = props.show
    ? cn(fullSizeStyles, resetPositionStyles, visibleStyles)
    : cn(fullSizeStyles, resetPositionStyles);

  if (error) {
    logError(
      '\r\nUnable to render this asset',
      '\r\n============================',
      '\r\nUnable to get the entry point',

      { error },
      '\r\nSpec of this asset is',

      props.spec,

      '\r\nPreferred Uploaders are',
      core.coreFunctions.core.getEpisodeData()?.preferredUploaders,
    );

    return (
      <ModuleContainer>
        <Error>{error.message}</Error>
      </ModuleContainer>
    );
  }

  return (
    <ModuleContainer>
      <Block
        ref={containerRef}
        className={blockStyle}
      >
        {result?.src
          ? <div ref={iFrameContainerRef} />
          : loading
        }
      </Block>
    </ModuleContainer>
  );
});

export const ActPoint = React.memo(InternalActPoint);
