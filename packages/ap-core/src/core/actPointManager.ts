import { v4 as uuidV4 } from 'uuid';
import { OpenPromise } from '@recative/open-promise';

import { PIXI_APP_INSTANCE_TYPE } from './pixiApp';
import type { IPixiApp } from './pixiApp';

import { THREE_APP_INSTANCE_TYPE } from './threeApp';
import type { IThreeApp } from './threeApp';

import { connectThreeAppToPixiApp } from './pixiThreeConnector';
import type { IPixiThreeConnector } from './pixiThreeConnector';

import { FrameRateLevel } from './TimeMagic';
import { createComponentContext } from './componentContext';
import { INITIALIZE_TASK_STORE } from './protocol';

import { useStore } from '../hooks/baseHooks';
import { useHostFunctions } from '../hooks/hostFunctionsHooks';

import { bindAppToPlayerEvent } from '../utils/bindAppToPlayerEvent';
import { InconsistentContextError } from '../constants/errors/InconsistentContextError';

type ISubApp = IPixiApp | IThreeApp;

const createElementContainer = (child: HTMLElement) => {
  const $container = document.createElement('DIV');
  $container.style.display = 'flex';
  $container.style.justifyContent = 'center';
  $container.style.alignItems = 'center';
  $container.style.position = 'fixed';
  $container.style.top = '0';
  $container.style.left = '0';
  $container.style.width = '100vw';
  $container.style.height = '100vh';
  $container.appendChild(child);

  return $container as HTMLDivElement;
};

class AlreadyDockedError extends Error {
  name = 'AlreadyDocked';

  constructor() {
    super('The application is already docked');
  }
}

const initializeFrameRateBooster = (context: IPixiApp['context']) => {
  let rawBoostCanceler: (() => void) | null = null;
  let timeout: number | null = null;

  const cancelBoost = () => {
    if (rawBoostCanceler) {
      rawBoostCanceler();
      rawBoostCanceler = null;
    }

    if (timeout) {
      window.clearTimeout(timeout);
      timeout = null;
    }
  };

  const boost = () => {
    cancelBoost();
    rawBoostCanceler = context.ticker.registryRateLevel(FrameRateLevel.D0, 'frameRateBoost');
  };

  const delayedCancelBoost = () => {
    timeout = window.setTimeout(cancelBoost, 1000);
  };

  window.addEventListener('pointerdown', boost);
  window.addEventListener('pointerup', delayedCancelBoost);
};

export class InitializeQueueClosedError extends Error {
  name = 'InitializeQueueClosed';

  constructor() {
    super('The initialize queue is closed, no more tasks can be added');
  }
}

const useRequireInitializeTaskCallback = () => {
  const hostFunctions = useHostFunctions();
  const [getInitializeTask] = useStore(INITIALIZE_TASK_STORE);
  let initializeWindowClosed = false;

  const initializeTasks = getInitializeTask();

  const requireInitializeTask = (fn: () => void | Promise<unknown>) => {
    if (initializeWindowClosed) {
      throw new InitializeQueueClosedError();
    }

    const taskId = uuidV4();

    const task = new OpenPromise<void>((resolve) => {
      Promise.resolve(fn()).finally(resolve);
    }, true);

    hostFunctions.connector.requireQueuedTask(taskId);

    initializeTasks.set(taskId, task);
  };

  window.setTimeout(() => {
    initializeWindowClosed = true;
  }, 0);

  return requireInitializeTask;
};

export const createActPointManager = () => {
  const $root = document.createElement('DIV');
  $root.style.width = '100vw';
  $root.style.height = '100vh';
  $root.style.position = 'fixed';
  $root.style.top = '0';
  $root.style.left = '0';

  const $sizeDetector = document.createElement('DIV');
  const $sizeDetectorLayer = createElementContainer($sizeDetector);
  $sizeDetector.style.width = '100%';
  $sizeDetector.style.paddingTop = 'calc((9 / 16) * 100%)';
  $root.appendChild($sizeDetectorLayer);

  const context = createComponentContext();
  const initialized = new OpenPromise<void>();
  let dockedPixiApp: IPixiApp | null = null;
  let dockedThreeApp: IThreeApp | null = null;
  // let dockedVideoApp: null = null;
  const pixiThreeConnector: IPixiThreeConnector | null = null;
  let requestedResize = false;
  const initializeTasks = new Set<Promise<any>>();
  const initializeTasksPromise = new OpenPromise<Set<Promise<any>>>();

  const requireInitializeTask = context.wrap(useRequireInitializeTaskCallback)();

  const resize = () => {
    const contentBoundingRect = $sizeDetector.getBoundingClientRect();
    const { width, height } = contentBoundingRect;
    dockedPixiApp?.resize(width, height);
    dockedThreeApp?.resize(width, height);
  };

  const requestResize = () => {
    if (requestedResize) return;

    requestedResize = true;
    window.requestAnimationFrame(() => {
      resize();
      requestedResize = false;
    });
  };

  if (typeof Window !== 'undefined') {
    window.addEventListener('resize', resize);
  }

  const connectApps = () => {
    if (dockedPixiApp && dockedThreeApp && !pixiThreeConnector) {
      connectThreeAppToPixiApp(dockedPixiApp, dockedThreeApp);
    }
  };

  const addPixiApp = (x: IPixiApp) => {
    if (x.context !== context) {
      const error = new InconsistentContextError();
      error.message = 'The context of the app is inconsistent with the context of the manager, '
       + 'you may forget to pass the context parameter to the pixi app initialize parameter.';
      throw error;
    }

    if (dockedPixiApp) {
      throw new AlreadyDockedError();
    }

    dockedPixiApp = x;
    const $layer = createElementContainer(dockedPixiApp.domElement);
    $root.appendChild($layer);

    const eventBindFinished = bindAppToPlayerEvent(context, requireInitializeTask);
    connectApps();
    requestResize();
    initializeFrameRateBooster(x.context);
    if (typeof Window !== 'undefined') {
      window.setTimeout(() => {
        initializeTasksPromise.resolve(initializeTasks);
        context.taskQueue.run();
        eventBindFinished.then(() => initialized.resolve());
      }, 0);
    }

    return eventBindFinished;
  };

  const addThreeApp = (x: IThreeApp) => {
    if (dockedThreeApp) {
      throw new AlreadyDockedError();
    }

    dockedThreeApp = x;
    const $layer = createElementContainer(dockedThreeApp.domElement);
    $root.appendChild($layer);

    connectApps();
    requestResize();
  };

  const add = (x: ISubApp) => {
    if (x.type === PIXI_APP_INSTANCE_TYPE) {
      addPixiApp(x);
    }

    if (x.type === THREE_APP_INSTANCE_TYPE) {
      addThreeApp(x);
    }
  };

  return {
    domElement: $root,
    add,
    context,
    requireInitializeTask,
    initialized: initialized.promise,
  };
};
