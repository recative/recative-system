import { clamp } from './clamp';
import { easingFunctions } from './easing';

export const RandomAnimationMapper = (
  bufferRatio: number = 0.3,
  easing: keyof typeof easingFunctions = 'easeInOutQuad',
) => {
  let bufferFactor = 0;

  const refreshBufferFactor = () => {
    bufferFactor = clamp(Math.random(), bufferRatio, 1 - bufferRatio);
  };

  refreshBufferFactor();

  return (progress: number) => {
    if (progress === 0) refreshBufferFactor();

    const leftThreshold = bufferFactor * bufferRatio;
    const rightThreshold = 1 - (1 - bufferFactor) * bufferRatio;

    if (progress < leftThreshold) {
      return 0;
    }
    if (progress > rightThreshold) {
      return 1;
    }
    const easingFn = easingFunctions[easing];
    return easingFn((progress - leftThreshold) / (1 - bufferRatio));
  };
};
