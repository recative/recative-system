import * as React from 'react';

import { EpisodeCore, SeriesCore } from '@recative/core-manager';

export const useCustomEventWrapper = <T extends Function>(
  callback: T | undefined,
  eventName: string,
  core: EpisodeCore | SeriesCore,
) => {
  const convertedCallback = React.useCallback(({ detail }: CustomEvent<any>) => {
    callback?.(detail);
  }, [callback]) as EventListener;

  React.useEffect(() => {
    core.eventTarget.addEventListener(
      eventName,
      convertedCallback,
    );

    return () => core.eventTarget.removeEventListener(
      eventName,
      convertedCallback,
    );
  }, [core, convertedCallback, eventName]);
};
