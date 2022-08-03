import { PreloadLevel } from '@recative/definitions';
import { allSettled, requestIdleCallback, OpenPromise } from '@recative/open-promise';

import { IComponentContext } from '../core/componentContext';
import { ENV_VARIABLE_STORE, INITIALIZE_TASK_STORE } from '../core/protocol';

import {
  useHostFunctions,
  HOST_FUNCTIONS_STORE,
  useResourceBridgeFunctions,
} from '../hooks/hostFunctionsHooks';
import { useStore } from '../hooks/baseHooks';

import { logBingAppToPlayerEvent } from './log';

export const bindAppToPlayerEvent = (
  context: IComponentContext,
  requireInitializeTask: (fn: () => void) => void | Promise<void>,
) => context.wrap(async () => {
  logBingAppToPlayerEvent('Bind app to player');
  const hostFunctions = useHostFunctions();
  const resourceBridgeFunctions = useResourceBridgeFunctions();
  const [getInitializeTasks] = useStore(INITIALIZE_TASK_STORE);

  const resourceList = await hostFunctions.connector.getResourceList();

  resourceList.filter((resource) => {
    if (resource.type !== 'file') { return false; }
    if (!resource.preloadTriggers?.includes(PreloadLevel.InsideActPoint)) { return false; }
    return true;
  }).forEach((resource) => {
    requireInitializeTask(() => new Promise<void>((resolve) => hostFunctions
      .connector
      .getResourceUrl(resource.id, 'id')
      .then((resourceUrl) => {
        if (!resourceUrl) { return null; }
        return fetch(resourceUrl);
      })
      .then(() => {
        resolve();
      })));
  });

  // Initialize registered tasks
  await allSettled(Array.from(getInitializeTasks().values()).map((x) => x.promise));

  // Initialize atoms
  context.store.register(HOST_FUNCTIONS_STORE);
  context.store.register(ENV_VARIABLE_STORE);

  // Initialize the resource bridge
  resourceBridgeFunctions.initialize();

  // Initialize envVariable
  const envVariable = context.store.getValue(ENV_VARIABLE_STORE);

  if (!envVariable) {
    await new Promise((resolveEnv) => {
      const unsubscribe = context.store.subscribe(
        ENV_VARIABLE_STORE,
        (env) => {
          if (!env) return;

          unsubscribe();
          resolveEnv(env);
        },
      );

      hostFunctions.connector.requireEnvironment();
    });
  }

  const finalTask = new OpenPromise<void>();
  requestIdleCallback(() => {
    hostFunctions.connector.ready();
    finalTask.resolve();
  }, {
    timeout: 3000,
  });

  return finalTask.promise;
})();
