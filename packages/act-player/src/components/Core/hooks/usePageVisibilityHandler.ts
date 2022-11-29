import * as React from 'react';

import { EpisodeCore } from '@recative/core-manager';

export const usePageVisibilityHandler = (pauseWhenNotVisible: boolean, core: EpisodeCore) => {
  const lastDocumentHidden = React.useRef(document.hidden);
  const playingBeforeHiddenRef = React.useRef(false);
  const handleVisibilityChange = React.useCallback(() => {
    if (lastDocumentHidden.current === document.hidden) {
      return;
    }
    lastDocumentHidden.current = document.hidden;
    if (pauseWhenNotVisible ?? true) {
      if (document.hidden) {
        playingBeforeHiddenRef.current = core.playing.get();
        core.pause();
      } else if (playingBeforeHiddenRef.current) {
        core.play();
      }
    }
  }, [core, pauseWhenNotVisible]);

  React.useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);
};
