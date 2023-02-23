import {
  now,
  timeRemaining,
  getFramePeriod,
  STABLE_FRAME_PERIOD,
} from './timeRemaining';

/**
 * A number representing the ID of the last canceled handle.
 */
let lastCancelHandleId = 0;
/**
 * A set of numbers representing the IDs of tasks in the task queue.
 */
const taskQueue = new Set<number>();

/**
 * A mock implementation of the `requestIdleCallback` function that uses the
 * browser's `requestAnimationFrame` to schedule tasks when the browser is
 * idle. This is used as a fallback when `requestIdleCallback` is not
 * supported by the browser.
 */
const mockRequestIdleCallback: typeof globalThis.requestIdleCallback = (
  callback,
  options
) => {
  // A number representing the ID of the current handle.
  const handleId = lastCancelHandleId + 1;
  // Increment the lastCancelHandleId with one for the next task.
  lastCancelHandleId = handleId;

  // Add the handleId to the task queue.
  taskQueue.add(handleId);

  // The time at which the task is scheduled.
  const scheduleTime = now();
  // An `IdleDeadline` object that is passed to the task's callback function
  // when it is executed.
  const idleDeadline = {
    timeRemaining,
    didTimeout: true,
  };

  // A function that attempts to run the task when the browser is idle.
  const tryTask = () => {
    // If the task has been canceled, do nothing.
    if (!taskQueue.has(handleId)) return;

    // The time at which the task is executed.
    const runningTime = now();
    // A boolean indicating whether the task has timed out.
    const didTimeout =
      runningTime - scheduleTime > (options?.timeout ?? Infinity);

    /**
     * If the browser is currently idle or the task has timed out, execute the
     * task and remove it from the task queue. Otherwise, wait until the next
     * animation frame to try again.
     */
    if (getFramePeriod() <= STABLE_FRAME_PERIOD || didTimeout) {
      idleDeadline.didTimeout = didTimeout;
      callback(idleDeadline);
      taskQueue.delete(handleId);
    } else {
      globalThis.requestAnimationFrame(tryTask);
    }
  };

  // Schedule the task to run on the next animation frame.
  globalThis.requestAnimationFrame(tryTask);

  // Return the handleId for the task.
  return handleId;
};

/**
 * A mock implementation of the `cancelIdleCallback` function that removes
 * the task with the specified handle ID from the task queue. This is used as
 * a fallback when `cancelIdleCallback` is not supported by the browser.
 */
const mockCancelIdleCallback: typeof globalThis.cancelIdleCallback = (
  handleId
) => {
  taskQueue.delete(handleId);
};

/**
 * The `requestIdleCallback` function to use, either the native implementation
 * or the fallback implementation if the native implementation is not
 * supported by the browser.
 */
export const requestIdleCallback =
  typeof globalThis?.requestIdleCallback === 'undefined'
    ? mockRequestIdleCallback
    : globalThis.requestIdleCallback;

/**
 * Cancels a scheduled idle callback previously registered with
 * `requestIdleCallback()`.
 */
export const cancelIdleCallback =
  typeof globalThis?.cancelIdleCallback === 'undefined'
    ? mockCancelIdleCallback
    : globalThis.cancelIdleCallback;
