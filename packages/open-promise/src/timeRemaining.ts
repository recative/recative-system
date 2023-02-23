/**
 * Determines if the `performance.now()` function is supported by the current
 * environment.
 */
const supportsPerformanceNow =
  typeof performance !== 'undefined' && typeof performance.now === 'function';

/**
 * Determines if the `IdleDeadline` interface is supported by the current
 * environment.
 */
const supportsTimeRemaining =
  typeof IdleDeadline !== 'undefined' &&
  typeof (IdleDeadline as any).timeRemaining === 'function';

/**
 * Returns the current time in milliseconds, using `performance.now()` if
 * available, otherwise using `Date.now()`.
 * @returns The current time in milliseconds.
 */
export const now = (): number => {
  if (supportsPerformanceNow) {
    return performance.now();
  }
  return Date.now();
};

/**
 * The target frame period, in milliseconds.
 */
export const STABLE_FRAME_PERIOD = 17;
/**
 * The default time to use as the deadline when calculating
 * `IdleDeadline.timeRemaining()`, in milliseconds.
 */
export const IDLE_TIME_REMAINING = 14;

let lastFrameTime = now();
let initialized = false;
/**
 * An array used to store the frame periods over time for calculating the
 * average frame period.
 */
const framePeriodBuffer = Array(20).fill(Infinity);
/**
 * The current position in the `framePeriodBuffer`.
 */
let framePeriodBufferPosition = 0;
/**
 * The current average frame period, in milliseconds.
 */
let framePeriod = 0;

/**
 * Returns the current average frame period, in milliseconds.
 * @returns The current average frame period, in milliseconds.
 */
export const getFramePeriod = () => framePeriod;

/**
 * Initializes the `framePeriodBuffer` and starts an animation frame loop to
 * continuously update the buffer.
 */
export const initializeTimeRemaining = () => {
  if (initialized) {
    return;
  }

  initialized = true;

  /**
   * Updates the `framePeriodBuffer` and `framePeriod`.
   */
  const updateFrameTime = () => {
    framePeriodBuffer[framePeriodBufferPosition] = now() - lastFrameTime;
    framePeriodBufferPosition =
      (framePeriodBufferPosition + 1) % framePeriodBuffer.length;
    let ΣPeriod = 0;

    for (let i = 0; i < framePeriodBuffer.length; i += 1) {
      ΣPeriod += framePeriodBuffer[i];
    }

    framePeriod = ΣPeriod / framePeriodBuffer.length;
    lastFrameTime = now();

    globalThis.requestAnimationFrame(updateFrameTime);
  };

  if (typeof window !== 'undefined' && !supportsTimeRemaining) {
    globalThis.requestAnimationFrame(updateFrameTime);
  }
};

/**
 * Calculates the time remaining until the deadline, either using the
 * `IdleDeadline.timeRemaining()` method if available,
 * or by estimating the time remaining based on the current time and the
 * previous frame time.
 * @param deadline The deadline to calculate the time remaining for, in
 *   milliseconds. Defaults to `IDLE_TIME_REMAINING`.
 * @returns The time remaining until the deadline, in milliseconds.
 */
const mockTimeRemaining = (deadline = IDLE_TIME_REMAINING) => {
  const timeRemaining = Math.max(deadline - (now() - lastFrameTime), 0);
  return timeRemaining;
};

/**
 * Calculates the time remaining until the deadline, either using the
 * `IdleDeadline.timeRemaining()` method if available,
 * or by estimating the time remaining based on the current time and the
 * previous frame time.
 * @param deadline The deadline to calculate the time remaining for, in
 * milliseconds. Defaults to `IDLE_TIME_REMAINING`.
 * @returns The time remaining until the deadline, in milliseconds.
 */
export const timeRemaining = (deadline = IDLE_TIME_REMAINING) => {
  if (!initialized) {
    initializeTimeRemaining();
  }

  if (supportsTimeRemaining) {
    return (IdleDeadline as any).timeRemaining();
  }
  return mockTimeRemaining(deadline);
};
