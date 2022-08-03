import * as THREE from 'three';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';

import {
  setContext,
  removeContext,
  createComponentContext,
} from './componentContext';
import { ResourceTracker } from './ResourceTracker';
import { EventTarget2, EventDefinition } from './EventTarget';
import type { IComponentContext } from './componentContext';

import { getCanvasSize } from '../utils/getCanvasSize';
import type { FunctionComponentProps } from '../types/components';

const [CANVAS_WIDTH, CANVAS_HEIGHT] = getCanvasSize();

export const THREE_APP_INSTANCE_TYPE = 'THREE_APP' as const;

interface IEnabledOrbitControlEventDetail {
  control: OrbitControls;
}

export const ENABLED_ORBIT_CONTROL = EventDefinition<IEnabledOrbitControlEventDetail>();
export const APP_INITIALIZED = EventDefinition<ILifeCycleProps>();

export interface IEnabledOrbitControlEvent {
  control: OrbitControls;
}

const cleanMaterial = (material: THREE.Material) => {
  material.dispose();

  const keys = Object.keys(material);

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];

    const value = material[key as keyof typeof material];
    if (value && typeof value === 'object' && 'minFilter' in value) {
      value.dispose();
    }
  }
};

export const clearScene = (scene: THREE.Scene) => {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    object.geometry.dispose();

    if (object.material.isMaterial) {
      cleanMaterial(object.material);
    } else {
      for (let i = 0; i < object.material.length; i += 1) {
        const material = object.material[i];
        cleanMaterial(material);
      }
    }
  });
};

export interface ILifeCycleProps {
  camera: THREE.Camera | null;
  scene: THREE.Scene;
  eventTarget: EventTarget2;
  resourceTracker: ResourceTracker;
  renderer: THREE.Renderer;
  controls: OrbitControls | null;
}

export type TLifeCycle = (props: ILifeCycleProps, x?: number) => void;
export type TPostProcessing = (
  x: EffectComposer,
  props: ILifeCycleProps & {
    renderPass: RenderPass;
  }
) => void;

export type FunctionComponent = (x: FunctionComponentProps) => THREE.Object3D;
export type FC = FunctionComponent;

export interface IThreeAppOptions {
  context?: IComponentContext;
  eventTarget?: EventTarget2 | null;
  camera: THREE.Camera | null;
  width?: number | null;
  height?: number | null;
  postProcessing?: TPostProcessing | null;
  appBeforeTick?: TLifeCycle | null;
  appAfterTick?: TLifeCycle | null;
  antialias?: boolean;
}

export const createThreeApp = (
  {
    context = createComponentContext(),
    camera,
    width,
    height,
    postProcessing,
    appBeforeTick,
    appAfterTick,
    antialias,
  }: IThreeAppOptions = {
    eventTarget: null,
    camera: null,
    width: null,
    height: null,
    postProcessing: null,
    appBeforeTick: null,
    appAfterTick: null,
    antialias: false,
  },
) => {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias });
  const cachedCamera = camera;
  let running = false;
  let updatePixiTextureCallback: () => void;
  let composer: EffectComposer | null = null;
  let destroyed = false;
  const { eventTarget, resourceTracker, ticker } = context;

  resourceTracker.track(renderer);

  const pixiCache = new WeakMap();
  const UPDATE_PIXI_TEXTURE_CALLBACK = {};
  const THREE_ORBIT_CONTROL = {};

  renderer.setPixelRatio(1);
  renderer.setSize(width || CANVAS_WIDTH, height || CANVAS_HEIGHT, true);
  renderer.localClippingEnabled = true;

  const lifeCycleProps: ILifeCycleProps = {
    camera: cachedCamera,
    scene,
    eventTarget,
    resourceTracker,
    renderer,
    get controls() {
      return (
        pixiCache.get(THREE_ORBIT_CONTROL) || (null as OrbitControls | null)
      );
    },
  };

  if (postProcessing && cachedCamera) {
    composer = new EffectComposer(renderer);
    const renderScene = new RenderPass(scene, cachedCamera);
    composer.addPass(renderScene);

    postProcessing(composer, {
      ...lifeCycleProps,
      renderPass: renderScene,
    });
  }

  const resize = (nextWidth: number, nextHeight: number) => {
    if (camera) {
      const internalCamera = camera as any;
      if ('aspect' in internalCamera) {
        internalCamera.aspect = nextWidth / nextHeight;
        internalCamera?.updateProjectionMatrix();
      }
    }

    renderer.setSize(nextWidth, nextHeight);
    composer?.setSize(nextWidth, nextHeight);
  };

  const destroy = () => {
    destroyed = true;
    eventTarget.dispose();
    clearScene(scene);
    resourceTracker.dispose();
  };

  const tick = (x: number) => {
    if (destroyed) return;
    if (!running) return;

    if (appBeforeTick) {
      appBeforeTick(lifeCycleProps, x);
    }

    if (cachedCamera) {
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, cachedCamera);
      }
    }

    if (pixiCache.has(UPDATE_PIXI_TEXTURE_CALLBACK)) {
      pixiCache.get(UPDATE_PIXI_TEXTURE_CALLBACK)();
    }

    if (appAfterTick) {
      appAfterTick(lifeCycleProps, x);
    }
  };

  ticker.addFn(tick);

  const registryPixiApp = (thisTick: typeof updatePixiTextureCallback) => {
    pixiCache.set(UPDATE_PIXI_TEXTURE_CALLBACK, thisTick);
  };

  const registryOrbitControl = (control: OrbitControls) => {
    pixiCache.set(THREE_ORBIT_CONTROL, control);

    eventTarget.fire(ENABLED_ORBIT_CONTROL, {
      control: pixiCache.get(THREE_ORBIT_CONTROL) as OrbitControls,
    });

    resourceTracker.track(control);
  };

  const add = (x: FunctionComponent) => {
    setContext(context);
    scene.add(x({}));
    removeContext();
  };

  const wrapContext = <T extends unknown[], U>(x: (...args: T) => U) => (...args: T) => {
    setContext(context);
    const result = x(...args);
    removeContext();

    return result;
  };

  eventTarget.fire(APP_INITIALIZED, lifeCycleProps);

  const pause = () => {
    running = false;
  };

  const play = () => {
    running = true;
  };

  return {
    type: THREE_APP_INSTANCE_TYPE,
    context,
    camera,
    scene,
    renderer,
    domElement: renderer.domElement,
    resize,
    destroy,
    add,
    pause,
    play,
    wrapContext,
    __registryPixiCanvas: registryPixiApp,
    __registryOrbitControl: registryOrbitControl,
  };
};

export type IThreeApp = ReturnType<typeof createThreeApp>;
