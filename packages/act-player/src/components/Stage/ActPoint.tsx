/* eslint-disable no-await-in-loop */
/* eslint-disable no-constant-condition */
import * as React from 'react';
import cn from 'classnames';

import useConstant from 'use-constant';
import { useStore } from '@nanostores/react';
import { useStyletron } from 'baseui';
import { useAsync, useThrottledCallback } from '@react-hookz/web';

import { ResolutionMode } from '@recative/definitions';

import { Block } from 'baseui/block';

import { Loading } from '../Loading/Loading';
import { ModuleContainer } from '../Layout/ModuleContainer';
import type { AssetExtensionComponent } from '../../types/ExtensionCore';

import { getController } from './actPointControllers';

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

export const InternalActPoint: AssetExtensionComponent = React.memo((props) => {
  const [css] = useStyletron();
  const [scale, setScale] = React.useState(1);
  const iFrameRef = React.useRef<HTMLIFrameElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoComponentInitialized = React.useRef(false);
  const resolution = useStore(props.core.resolution);
  const width: number | undefined = resolution?.width;
  const height: number | undefined = resolution?.height;

  const getEntryPointUrl = React.useCallback(async () => {
    const episodeData = props.core.getEpisodeData()!;
    const entryPoints = props.spec.entryPoints as Record<string, string>;

    return episodeData.resources.getResourceByUrlMap(entryPoints);
  }, [props.spec.entryPoints]);

  const [{ result: entryPoint }, entryPointAction] = useAsync(getEntryPointUrl);

  React.useEffect(() => {
    entryPointAction.execute();
  }, []);

  const { iFrameWidth, iFrameHeight } = React.useMemo(() => {
    const specResolution = props.spec.resolutionMode as ResolutionMode;
    const resolutionMode = specResolution ?? ResolutionMode.FollowPlayerSetting;

    if (resolutionMode === ResolutionMode.FixedSize) {
      return {
        iFrameWidth: props.spec.width as number,
        iFrameHeight: props.spec.height as number,
      };
    }
    if (resolutionMode === ResolutionMode.FollowWindowSize) {
      return {
        iFrameWidth: -1,
        iFrameHeight: -1,
      };
    }
    return {
      iFrameWidth: width === undefined ? -1 : width,
      iFrameHeight: height === undefined ? -1 : height,
    };
  }, []);

  const updateActPointScale = useThrottledCallback(
    () => {
      if (!containerRef.current) return;
      if (width === undefined || height === undefined) {
        return;
      }

      const $container = containerRef.current;
      const actPointRatio = iFrameWidth / iFrameHeight;
      const containerRatio = $container.clientWidth / $container.clientHeight;

      const nextScale = actPointRatio < containerRatio
        ? $container.clientHeight / iFrameHeight
        : $container.clientWidth / iFrameWidth;

      setScale(nextScale);
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
  }, [scale]);

  React.useEffect(() => {
    window.addEventListener('resize', updateActPointScale);

    return () => window.removeEventListener('resize', updateActPointScale);
  }, [updateActPointScale]);

  React.useEffect(() => {
    setTimeout(updateActPointScale, 0);
  }, [width, height, props.show]);

  const fullSizeStyles = css(FULL_SIZE_STYLES);
  const visibleStyles = css(VISIBLE_STYLES);
  const resetPositionStyles = css(RESET_POSITION_STYLES);
  const iFrameStyles = css(IFRAME_STYLES);
  const iFrameSizeStyles = css(iFrameSizeStyleDefinition);

  const core = useConstant(() => {
    const controller = getController(props.id);

    const coreFunctions = props.core.registerComponent(
      props.id,
      controller.controller,
    );

    controller.setCoreFunctions(coreFunctions);

    return { controller, coreFunctions, destroyConnector: controller.destroyConnector };
  });

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
  }, []);

  React.useEffect(() => {
    return () => {
      core.destroyConnector();
    };
  }, []);

  React.useLayoutEffect(() => {
    if (videoComponentInitialized.current) return;
    if (!entryPoint) return;

    const $iFrame = iFrameRef.current;
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
  }, [entryPoint]);

  React.useEffect(() => {
    core.coreFunctions.updateContentState('preloading');

    return () => props.core.unregisterComponent(props.id);
  }, [props.id]);

  const LoadingComponent = props.loadingComponent ?? Loading;

  const loading = props.show ? <LoadingComponent /> : null;

  const blockStyle = props.show
    ? cn(fullSizeStyles, resetPositionStyles, visibleStyles)
    : cn(fullSizeStyles, resetPositionStyles);

  return (
    <ModuleContainer>
      <Block
        ref={containerRef}
        className={blockStyle}
      >
        {entryPoint ? (
          <iframe
            hidden={!props.show}
            ref={iFrameRef}
            className={cn(iFrameStyles, iFrameSizeStyles)}
            width={iFrameWidth}
            height={iFrameHeight}
            src={entryPoint}
          />
        ) : (
          loading
        )}
      </Block>
    </ModuleContainer>
  );
});

export const ActPoint = React.memo(InternalActPoint);
