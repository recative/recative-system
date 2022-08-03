import {
  setContext,
  removeContext,
  getContext,
} from '../core/componentContext';
import { contextGuard } from '../utils/contextGuard';
import { InconsistentContextError } from '../constants/errors/InconsistentContextError';

import { AtomName } from '../core/AtomStore';

export const useStyleSheet = () => contextGuard().stylesheet;

export const useResourceTracker = () => contextGuard().resourceTracker;

export const useEventTarget = () => contextGuard().eventTarget;

export const useTicker = () => contextGuard().ticker;

export const useCallback = <T extends unknown[], U>(x: (...args: T) => U) => {
  const context = contextGuard();

  return (...args: T) => {
    const currentContext = getContext();
    const sameContext = currentContext === context;
    if (currentContext && !sameContext) {
      throw new InconsistentContextError();
    }

    if (!currentContext) {
      setContext(context);
    }
    x(...args);
    if (!currentContext) {
      removeContext();
    }
  };
};

export const useContext = () => contextGuard();

export const useStore = <T>(x: AtomName<T>) => {
  const context = contextGuard();

  const { store } = context;

  store.register(x);

  const getter = () => store.getValue(x);
  const setter = (v: T) => store.setValue(x, v);
  const subscribe = (fn: (x: T) => void) => {
    store.subscribe(x, fn);

    return {
      getter,
      unsubscribe: () => store.unsubscribe(x, fn),
    };
  };

  return [getter, setter, subscribe] as const;
};

class AlreadyDestroyedTimingHookError extends Error {
  name = 'AlreadyDestroyed';

  constructor() {
    super('Trying to start a destroyed timing hook, which is not possible.');
  }
}

const useAbstractTimingHook = (
  timingFn: typeof window.setTimeout | typeof window.setInterval,
  clearFn: typeof window.clearTimeout | typeof window.clearInterval,
  fn: () => void,
  time: number,
) => {
  const resourceTracker = useResourceTracker();

  let timeout: number | NodeJS.Timeout | null = null;
  let destroyed: boolean = false;

  const stop = () => {
    if (timeout) {
      clearFn(timeout as number);
      timeout = null;
    }
  };

  const start = () => {
    if (destroyed) {
      throw new AlreadyDestroyedTimingHookError();
    }

    stop();
    timeout = timingFn(fn, time);
  };

  resourceTracker.track({
    dispose() {
      stop();
      destroyed = true;
    },
  });

  return [start, stop];
};

export const useTimeout = (fn: () => void, time: number) => useAbstractTimingHook(
  window.setTimeout,
  window.clearTimeout,
  fn,
  time,
);

export const useInterval = (fn: () => void, time: number) => useAbstractTimingHook(
  window.setInterval,
  window.clearInterval,
  fn,
  time,
);
