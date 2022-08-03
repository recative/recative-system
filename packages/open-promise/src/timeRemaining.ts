const supportsPerformanceNow = typeof performance !== 'undefined' && typeof performance.now === 'function';

const supportsTimeRemaining = typeof IdleDeadline !== 'undefined'
  && typeof (IdleDeadline as any).timeRemaining === 'function';

export const now = (): number => {
  if (supportsPerformanceNow) {
    return performance.now();
  }
  return Date.now();
};

export const STABLE_FRAME_PERIOD = 17;
export const IDLE_TIME_REMAINING = 14;

let lastFrameTime = now();
let initialized = false;
const framePeriodBuffer = Array(20).fill(Infinity);
let framePeriodBufferPosition = 0;
let framePeriod = 0;

export const getFramePeriod = () => framePeriod;

export const initializeTimeRemaining = () => {
  if (initialized) {
    return;
  }

  initialized = true;

  const updateFrameTime = () => {
    framePeriodBuffer[framePeriodBufferPosition] = now() - lastFrameTime;
    framePeriodBufferPosition = (framePeriodBufferPosition + 1) % framePeriodBuffer.length;
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

const mockTimeRemaining = (deadline = IDLE_TIME_REMAINING) => {
  const timeRemaining = Math.max(deadline - (now() - lastFrameTime), 0);
  return timeRemaining;
};

export const timeRemaining = (deadline = IDLE_TIME_REMAINING) => {
  if (!initialized) {
    initializeTimeRemaining();
  }

  if (supportsTimeRemaining) {
    return (IdleDeadline as any).timeRemaining();
  }
  return mockTimeRemaining(deadline);
};
