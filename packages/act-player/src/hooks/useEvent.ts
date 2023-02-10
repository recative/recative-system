import * as React from 'react';

const useBrowserEffect =
  typeof window !== 'undefined' ? React.useInsertionEffect : () => {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useEvent = <T extends (...parameter: U) => R, U extends any[], R>(
  fn: T
) => {
  const ref = React.useRef<T | null>(null);

  useBrowserEffect(() => {
    ref.current = fn;
  }, [fn]);

  return React.useCallback((...args: U) => {
    if (!ref.current) {
      throw new TypeError(`ref.current is not defined, this is a bug.`);
    }

    return ref.current(...args);
  }, []) as unknown as T;
};
