import { PreloadLevel } from '@recative/definitions';
import {
  allSettled,
  requestIdleCallback,
  OpenPromise,
} from '@recative/open-promise';

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
  requireInitializeTask: (fn: () => void) => void | Promise<void>
) =>
  context.wrap(async () => {
    logBingAppToPlayerEvent('Bind app to player');
    const hostFunctions = useHostFunctions();
    const resourceBridgeFunctions = useResourceBridgeFunctions();
    const [getInitializeTasks] = useStore(INITIALIZE_TASK_STORE);

    const resourceList = await hostFunctions.connector.getResourceList();

    const preloadedResources = resourceList.filter((resource) => {
      if (resource.type !== 'file') {
        return false;
      }
      if (resource.preloadLevel !== PreloadLevel.InsideActPoint) {
        return false;
      }

      // If the resource is cached to hard-disk, we think that it do not
      // need to be preloaded. since the loading speed should be fast
      // enough. And there's an edge case, the bare bundle created by
      // Recative Studio, no resource will be cached, this case should be
      // handled by the web-root template properly.
      if (resource.cacheToHardDisk) {
        return null;
      }

      return true;
    });

    logBingAppToPlayerEvent(
      `Try to preload resources: ${preloadedResources.length}`
    );

    preloadedResources.forEach((resource) => {
      requireInitializeTask(async () => {
        const resourceUrl = await hostFunctions.connector.getResourceUrl(
          resource.id,
          'id'
        );

        if (!resourceUrl) {
          return null;
        }

        return fetch(resourceUrl);
      });
    });

    // Initialize registered tasks
    await allSettled(
      Array.from(getInitializeTasks().values()).map((x) => x.promise)
    );

    // Initialize atoms
    context.store.register(HOST_FUNCTIONS_STORE);
    context.store.register(ENV_VARIABLE_STORE);

    // Initialize the resource bridge
    resourceBridgeFunctions.initialize();

    // Initialize envVariable
    if (!context.store.getValue(ENV_VARIABLE_STORE)) {
      await new Promise((resolveEnv) => {
        const unsubscribe = context.store.subscribe(
          ENV_VARIABLE_STORE,
          (env) => {
            if (!env) return;

            unsubscribe();
            resolveEnv(env);
          }
        );

        hostFunctions.connector.requireEnvironment();
      });
    }

    const finalTask = new OpenPromise<void>();
    requestIdleCallback(
      () => {
        hostFunctions.connector.ready();
        finalTask.resolve();
      },
      {
        timeout: 3000,
      }
    );

    return finalTask.promise;
  })();
