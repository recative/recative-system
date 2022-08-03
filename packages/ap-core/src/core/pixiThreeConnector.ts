import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import type { IPixiApp } from './pixiApp';
import type { IThreeApp } from './threeApp';

import { AtomDefinition } from './AtomStore';

import { InconsistentContextError } from '../constants/errors/InconsistentContextError';

export interface IConnectedThreeAppEventDetail {
  enableOrbitControl: () => OrbitControls;
}

export const CONNECTED_THREE_APP = AtomDefinition<IConnectedThreeAppEventDetail | null>(null);

class ThreeAppNotConnectedError extends Error {
  name = 'ThreeAppNotConnected';

  constructor() {
    super('Three app not connected.');
  }
}

class NoCameraError extends Error {
  name = 'NoCamera';

  constructor() {
    super('Three app don not have a valid camera.');
  }
}

export const connectThreeAppToPixiApp = (
  pixiApp: IPixiApp,
  threeApp: IThreeApp,
) => {
  if (pixiApp.context !== threeApp.context) {
    const error = new InconsistentContextError();
    error.message = 'The context of pixiApp and threeApp should be the same.';

    throw error;
  }

  const threeCache = new WeakMap();
  const THREE_APP = {};
  const THREE_ORBIT_CONTROL = {};

  const enableOrbitControl = () => {
    if (!threeCache.has(THREE_APP)) {
      throw new ThreeAppNotConnectedError();
    }

    const thisThreeApp = threeCache.get(THREE_APP) as IThreeApp;

    if (!thisThreeApp.camera) {
      throw new NoCameraError();
    }

    const control = new OrbitControls(thisThreeApp.camera, pixiApp.app.view);
    threeCache.set(THREE_ORBIT_CONTROL, control);

    thisThreeApp.__registryOrbitControl(control);
    return control;
  };

  const destroy = () => {
    const control = threeCache.get(THREE_ORBIT_CONTROL) as OrbitControls;
    if (control) {
      control.dispose();
    }
  };

  if (threeApp && threeApp.domElement) {
    threeCache.set(THREE_APP, threeApp);
    pixiApp.context.store.register(CONNECTED_THREE_APP);
    pixiApp.context.store.setValue(CONNECTED_THREE_APP, { enableOrbitControl });
  }

  return {
    enableOrbitControl,
    destroy,
    get orbitControl() {
      return threeCache.get(THREE_ORBIT_CONTROL);
    },
  };
};

export type IPixiThreeConnector = ReturnType<typeof connectThreeAppToPixiApp>;
