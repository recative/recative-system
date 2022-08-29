import anime from 'animejs';
import type { AnimeParams, AnimeInstance } from 'animejs';

import {
  useTicker,
  useTimeout,
  useCallback,
  useResourceTracker,
} from './baseHooks';
import { DataSource } from '../core/DataSource';
import { FrameRateLevel, TickCallback } from '../core/TimeMagic';

const { timeline } = anime;

type IAnimeParameters = AnimeParams & { target?: never };

export const useAnime = (
  x: IAnimeParameters,
  frameRateLevel: FrameRateLevel = FrameRateLevel.D1,
) => {
  const ticker = useTicker();
  const resourceTracker = useResourceTracker();
  const result = anime({ ...x, autoplay: false });

  const animeTicker = result.tick.bind(result);
  const tickFunction = (timestamp: number) => {
    if (result.paused) return;
    animeTicker(timestamp);
  };

  resourceTracker.track({
    dispose() {
      result.pause();
      ticker.removeFn(tickFunction);
    },
  });

  result.play = () => {
    if (!result.paused) { return; }
    // @ts-ignore
    if (result.completed) { result.reset(); }
    result.pause();
    result.paused = false;
  };

  if (x.autoplay !== false) {
    result.play();
  }

  ticker.addFn(tickFunction, frameRateLevel);

  return result;
};

export const useToggleAnime = (
  x: Omit<IAnimeParameters, 'autoplay'>,
  lazy = true,
  frameRateLevel?: FrameRateLevel,
) => {
  let instance: AnimeInstance | null = null;

  const initialize = useCallback(() => {
    if (!instance) {
      instance = useAnime({ ...x, autoplay: false }, frameRateLevel);
    }
  });

  if (!lazy) {
    initialize();
  }

  let isForward = true;

  const forward = () => {
    initialize();

    isForward = true;

    if (instance!.reversed) {
      instance!.reverse();
    }

    instance!.play();
  };

  const backward = () => {
    initialize();

    isForward = false;

    if (!instance!.reversed) {
      instance!.reverse();
    }

    instance!.play();
  };

  const toggle = () => {
    initialize();

    isForward = !isForward;
    instance!.reverse();
    instance!.play();
  };

  return [forward, backward, toggle];
};

export const useAnimeTimeline = (
  x: AnimeParams,
  frameRateLevel: FrameRateLevel = FrameRateLevel.D1,
) => {
  const ticker = useTicker();
  const resourceTracker = useResourceTracker();
  const result = timeline({ ...x, autoplay: false });

  const animeTicker = result.tick.bind(result);
  const tickFunction = (timestamp: number) => {
    if (result.paused) return;
    animeTicker(timestamp);
  };

  resourceTracker.track({
    dispose() {
      result.pause();
      ticker.removeFn(tickFunction);
    },
  });

  result.play = () => {
    if (!result.paused) { return; }
    // @ts-ignore
    if (result.completed) { result.reset(); }
    result.pause();
    result.paused = false;
  };

  result.autoplay = x.autoplay !== false;

  ticker.addFn(tickFunction, frameRateLevel);

  return result;
};

export const useRaf = (fn: TickCallback, frameRateLevel?: FrameRateLevel) => {
  const ticker = useTicker();

  const wrappedFn: TickCallback = (...x) => {
    fn(...x);
  };

  const play = () => {
    ticker.addFn(wrappedFn, frameRateLevel);
  };

  const stop = () => {
    ticker.removeFn(wrappedFn);
  };

  return [play, stop] as const;
};

export const useLerp = (
  getCurrentValFn: () => number,
  updateFn: (x: number) => void,
  damping: number = 0.15,
  threshold: number = 1e-5,
  frameRateLevel: FrameRateLevel = FrameRateLevel.D1,
) => {
  let targetValue = getCurrentValFn();
  let cachedDamping = damping;

  const [startLerp, stopLerp] = useRaf((_, __, ticksElapsed) => {
    const currentValue = getCurrentValFn();
    updateFn(
      currentValue + (targetValue - currentValue) * cachedDamping * ticksElapsed,
    );
    if (Math.abs(targetValue - currentValue) < threshold) {
      updateFn(targetValue);
      stopLerp();
    }
  }, frameRateLevel);

  const updateValue = (x: number) => {
    if (x === getCurrentValFn()) return;
    targetValue = x;
    startLerp();
  };

  const updateDamping = (x: number) => {
    cachedDamping = x;
  };

  return [updateValue, startLerp, stopLerp, updateDamping] as const;
};

export const useLerpDataSource = (
  initialValue: number,
  damping: number = 0.15,
  threshold: number = 1e-5,
  frameRateLevel?: FrameRateLevel,
) => {
  const dataSource = new DataSource(initialValue);

  const [updateValue, startLerp, stopLerp, updateDamping] = useLerp(
    () => dataSource.data,
    (x) => {
      dataSource.data = x;
    },
    damping,
    threshold,
    frameRateLevel,
  );

  const { subscribe } = dataSource;

  return [updateValue, subscribe, startLerp, stopLerp, updateDamping] as const;
};

export const useBatchPaint = (x: () => void) => {
  const resourceTracker = useResourceTracker();
  let requestedPaint = false;
  let canceled = false;

  const call = () => {
    if (requestedPaint) return;

    requestedPaint = true;
    window.requestAnimationFrame(() => {
      if (canceled) return;
      x();
      requestedPaint = false;
    });
  };

  resourceTracker.track({
    dispose: () => {
      canceled = true;
    },
  });

  return call;
};

export const useThrottle = <T extends unknown[], U>(
  x: (...args: T) => U,
  time = 1000 / 24,
) => {
  let inThrottle: boolean;

  const [startTimeout] = useTimeout(() => {
    inThrottle = false;
  }, time);

  return (...args: T) => {
    if (inThrottle) return;
    inThrottle = true;

    x(...args);
    startTimeout();
  };
};
