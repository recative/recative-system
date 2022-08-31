import * as React from 'react';

import { EpisodeCore } from '@recative/core-manager';

export const useFullScreen = (
  fullScreen: boolean,
  core: EpisodeCore,
  containerRef: React.RefObject<HTMLDivElement>,
) => {
  const getCurrentFullscreenElement = () => {
    // Fuck you iOS.
    if ('webkitFullscreenElement' in document) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (document as any).webkitFullscreenElement;
    }
    return document.fullscreenElement;
  };

  const $player = containerRef.current;

  React.useEffect(() => {
    const enableFullScreen = core.getUserImplementedFunctions()?.enableAppFullScreenMode;
    const disableFullScreen = core.getUserImplementedFunctions()?.disableAppFullScreenMode;
    const currentFullscreenElement = getCurrentFullscreenElement();

    if (!$player) {
      if (fullScreen) {
        core.fullScreen.set(false);
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
  }, [$player, core, fullScreen]);

  const handleFullScreenChange = React.useCallback(() => {
    const currentFullscreenElement = getCurrentFullscreenElement();
    core.fullScreen.set(
      $player !== undefined && $player === currentFullscreenElement,
    );
  }, [$player, core.fullScreen]);

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

  return { handleFullScreenChange, getCurrentFullscreenElement };
};
