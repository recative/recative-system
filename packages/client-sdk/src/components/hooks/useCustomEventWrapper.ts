import * as React from 'react';

import { EpisodeCore, SeriesCore } from '@recative/core-manager';

export const useCustomEventWrapper = <T>(
  callback0: ((x: T) => void) | undefined,
  callback1: ((x: T) => void) | undefined,
  eventName: string,
  // This could be any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  core: EpisodeCore<any> | SeriesCore<any>,
) => {
  const convertedCallback = React.useCallback(({ detail }: CustomEvent<T>) => {
    callback0?.(detail);
    callback1?.(detail);
  }, [callback0, callback1]) as EventListener;

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
