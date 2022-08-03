import * as PIXI from 'pixi.js-legacy';

import { STAGE_STORE } from '../core/pixiApp';

import { useStore } from './baseHooks';

export const useEventCoordinateTransformer = () => {
  const [getStage] = useStore(STAGE_STORE);
  const stage = getStage()!;

  return (event: PIXI.InteractionEvent) => event.data.getLocalPosition(stage);
};
