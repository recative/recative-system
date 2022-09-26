import * as PIXI from 'pixi.js-legacy';
import type { InteractionManager } from '@pixi/interaction';
import {
  createComponentContext,
  setContext,
  removeContext,
} from './componentContext';
import { AtomDefinition } from './AtomStore';
import { EventDefinition } from './EventTarget';
import { FrameOrderLevel, DEFAULT_FRAME_RATE_LEVEL } from './TimeMagic';
import type { IComponentContext } from './componentContext';

import { getCanvasSize } from '../utils/getCanvasSize';

const [CANVAS_WIDTH, CANVAS_HEIGHT] = getCanvasSize();
export const PIXI_APP_INSTANCE_TYPE = 'PIXI_APP' as const;

const DEV_SITES = [/meow$/, /^localhost$/, /^192\.168\./, /^0\.0\./];

export const DEV_MODE = DEV_SITES.findIndex((x) => x.test(window.location.hostname)) !== -1;

if (DEV_MODE) {
  // For PIXI debugger on Chrome.
  // Checkout https://github.com/bfanger/pixi-inspector/issues/35#issuecomment-574539526
  // @ts-ignore
  window.PIXI = PIXI;
} else {
  // Disable PIXI console hello (the pink text).
  PIXI.utils.skipHello();
}

export class AlreadyDestroyedError extends Error {
  name = 'DestroyedError';

  constructor() {
    super('The PIXI app has already been destroyed.');
  }
}

export type PixiFunctionComponent = () => PIXI.DisplayObject;
export type PixiFC = PixiFunctionComponent;

export interface IPixiAppOptions {
  context?: IComponentContext;
  pixiOptions?: PIXI.IApplicationOptions;
  resolutionMode?: 'window' | 'player';
}

export const DESTROYED_APP = EventDefinition();
export const RAW_PIXI_APP_STORE = AtomDefinition<PIXI.Application | null>(null);
export const STAGE_STORE = AtomDefinition<PIXI.Container | null>(null);

export const createPixiApp = ({
  context = createComponentContext(),
  pixiOptions = {},
  resolutionMode = 'player',
}: IPixiAppOptions) => {
  // const isSafari = navigator.vendor.indexOf('Apple') > -1;
  const app = new PIXI.Application({
    // iOS 15.4 WebGL on Metal bug
    antialias: false,
    autoStart: false,
    // @ts-ignore: This config exists
    failIfMajorPerformanceCaveat: false,
    ...(resolutionMode === 'player'
      ? {
        resolution: 1,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      }
      : {
        // iOS performance
        resolution:
        window.devicePixelRatio,
        // Math.floor(
        //       Math.min(
        //         2,
        //         window.devicePixelRatio,
        //         isSafari
        //           ? 1080
        //               / Math.min(
        //                 window.screen.availHeight,
        //                 window.screen.availWidth,
        //               )
        //           : Infinity,
        //         isSafari
        //           ? 1920
        //               / Math.max(
        //                 window.screen.availHeight,
        //                 window.screen.availWidth,
        //               )
        //           : Infinity,
        //       ) * 2,
        //     ) / 2,
        width: window.innerWidth,
        height: window.innerHeight,
        autoDensity: true,
      }),
    ...pixiOptions,
  });

  app.resize();
  app.ticker.autoStart = false;
  app.ticker.started = false;
  app.ticker.stop();
  const interactionManager = app.renderer.plugins.interaction as InteractionManager;
  interactionManager.useSystemTicker = false;

  context.ticker.addFn(
    interactionManager.tickerUpdate.bind(interactionManager),
    DEFAULT_FRAME_RATE_LEVEL,
    FrameOrderLevel.O1,
  );

  let destroyed = false;

  const stage = new PIXI.Container();
  const { eventTarget } = context;
  app.stage.addChild(stage);

  const resize = (width: number, height: number) => {
    if (resolutionMode === 'window') {
      app.renderer.resize(window.innerWidth, window.innerHeight);
    } else {
      const ratio = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
      stage.scale.set(ratio);
      const offsetTop = (height - CANVAS_HEIGHT * ratio) / 2;
      const offsetLeft = (width - CANVAS_WIDTH * ratio) / 2;
      stage.position.set(offsetLeft, offsetTop);
      app.renderer.resize(width, height);
    }
    app.render();
  };

  const destroy = () => {
    destroyed = true;
    eventTarget.fire(DESTROYED_APP);

    eventTarget.dispose();

    app.loader.reset();
    context.resourceTracker.dispose();

    app.destroy(true, {
      children: true,
      texture: true,
      baseTexture: true,
    });
  };

  const add = (x: PixiFunctionComponent) => {
    if (destroyed) {
      throw new AlreadyDestroyedError();
    }

    setContext(context);
    stage.addChild(x());
    removeContext();
  };

  context.store.register(RAW_PIXI_APP_STORE);
  context.store.setValue(RAW_PIXI_APP_STORE, app);

  context.store.register(STAGE_STORE);
  context.store.setValue(STAGE_STORE, stage);

  let paused = false;

  context.ticker.addFn((x) => {
    if (paused) return;
    app.ticker.update(x);
  });

  const pause = () => {
    paused = true;
  };

  const play = () => {
    paused = false;
  };

  return {
    type: PIXI_APP_INSTANCE_TYPE,
    app,
    domElement: app.view,
    stage,
    resize,
    destroy,
    add,
    pause,
    play,
    /**
     * @deprecated use pixiApp.context.wrap instead.
     */
    wrapContext: context.wrap,
    context,
  };
};

export type IPixiApp = ReturnType<typeof createPixiApp>;
