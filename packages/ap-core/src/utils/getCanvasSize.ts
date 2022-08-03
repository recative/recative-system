import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LEGACY_CANVAS_WIDTH,
  LEGACY_CANVAS_HEIGHT,
} from '../constants/screenSize';

export const getCanvasSize = () => {
  try {
    if (process.env.LEGACY_RESOLUTION === 'true') {
      return [LEGACY_CANVAS_WIDTH, LEGACY_CANVAS_HEIGHT] as const;
    }
    return [CANVAS_WIDTH, CANVAS_HEIGHT] as const;
  } catch (e) {
    return [CANVAS_WIDTH, CANVAS_HEIGHT] as const;
  }
};
