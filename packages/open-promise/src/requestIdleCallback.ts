import {
  now, timeRemaining, getFramePeriod, STABLE_FRAME_PERIOD,
} from './timeRemaining';

let lastCancelHandleId = 0;
const taskQueue = new Set<number>();

const mockRequestIdleCallback: typeof globalThis.requestIdleCallback = (callback, options) => {
  const handleId = lastCancelHandleId + 1;
  lastCancelHandleId = handleId;

  taskQueue.add(handleId);

  const scheduleTime = now();
  const idleDeadline = {
    timeRemaining,
    didTimeout: true,
  };

  const tryTask = () => {
    if (!taskQueue.has(handleId)) return;

    const runningTime = now();
    const didTimeout = runningTime - scheduleTime > (options?.timeout ?? Infinity);

    if (getFramePeriod() <= STABLE_FRAME_PERIOD || didTimeout) {
      idleDeadline.didTimeout = didTimeout;
      callback(idleDeadline);
      taskQueue.delete(handleId);
    } else {
      globalThis.requestAnimationFrame(tryTask);
    }
  };

  globalThis.requestAnimationFrame(tryTask);

  return handleId;
};

const mockCancelIdleCallback: typeof globalThis.cancelIdleCallback = (handleId) => {
  taskQueue.delete(handleId);
};

export const requestIdleCallback = typeof globalThis?.requestIdleCallback === 'undefined' ? mockRequestIdleCallback : globalThis.requestIdleCallback;
export const cancelIdleCallback = typeof globalThis?.cancelIdleCallback === 'undefined' ? mockCancelIdleCallback : globalThis.cancelIdleCallback;
