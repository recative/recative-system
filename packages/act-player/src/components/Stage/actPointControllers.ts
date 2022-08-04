/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */
import { debug } from 'debug';

import { UserImplementedFunctions } from '@recative/definitions';
import { createHostConnector, HostFunctions } from '@recative/act-protocol';
import type { ResourceLoaderCacheLevel } from '@recative/definitions';
import type { ComponentFunctions, CoreFunctions } from '@recative/core-manager';

const log = debug('player:ap-control');

export const getController = (id: string) => {
  let $actPoint: HTMLIFrameElement | null = null;
  let connector: ReturnType<typeof createHostConnector> | null = null;
  let coreFunctions: CoreFunctions | null = null;

  let actPointReady = false;
  let actPointShown = false;

  const startActPoint = () => {
    if (!$actPoint) return false;
    if (!connector) return false;
    if (!actPointReady) return false;
    if (!actPointShown) return false;

    connector.connector.show();
  };

  const forwardToCoreFunctions = <
      T extends keyof CoreFunctions,
      F extends Extract<CoreFunctions[T], (...args: never[]) => unknown>,
      P extends Parameters<F>,
    >(
      key: T,
    ) => (...args: P) => {
      if (!coreFunctions) {
        throw new Error('Core functions not set');
      }

      return (coreFunctions[key] as any)?.(...args);
    };

  const forwardToUserImplementedFunctions = <
      T extends keyof UserImplementedFunctions,
      F extends Extract<
      UserImplementedFunctions[T],
      (...args: never[]) => unknown
      >,
      P extends Parameters<F>,
    >(
      key: T,
    ) => (...args: P) => {
      if (!coreFunctions) {
        throw new Error('Core functions not set');
      }

      return (coreFunctions.core.getUserImplementedFunctions()[key] as any)?.(
        ...args,
      );
    };

  const setActPointTag = (actPointTag: HTMLIFrameElement) => {
    if ($actPoint) return;

    $actPoint = actPointTag;

    const getResourceMetadata = (resourceId: string, type: 'label' | 'id') => {
      const { resources } = coreFunctions!.core.getEpisodeData()!;

      if (type === 'id') {
        return resources.itemsById.get(resourceId) ?? null;
      }
      if (type === 'label') {
        return resources.itemsByLabel.get(resourceId) ?? null;
      }

      throw new Error('Unknown resource type');
    };

    connector = createHostConnector(
      new Proxy(
        {
          ready: () => {
            try {
              coreFunctions!.updateContentState('ready');
            } catch (e) {
              log('Unable to create a host connector', e);
            }
          },
          loading: () => {
            // Work in progress
          },
          complete: () => {
            // Work in progress
          },
          close: () => {
            coreFunctions!.finishItself();
          },
          requireEnvironment: () => {
            if (!connector) {
              throw new TypeError('Connector not available');
            }

            const envVariable = coreFunctions?.core.envVariableManager.envVariableAtom.get();

            if (!envVariable) {
              throw new TypeError('Environment variable not available');
            }

            connector.connector.updateEnvironment(envVariable);
          },
          getResourceMetadata: (
            resourceId: string,
            type: 'label' | 'id',
          ) => {
            const resources = coreFunctions!.core.getEpisodeData()!.resources;

            const resource = getResourceMetadata(resourceId, type);
            if (!resource) return null;
            if (resource.type === 'group') {
              return {
                ...resource,
                files: resource.files
                  .map((x) => resources.filesById.get(x.id)!)
                  .filter(Boolean),
              };
            }
            return resource;
          },
          getResourceUrl: async (
            resourceId: string,
            searchBy: 'label' | 'id',
            resourceType?: 'group' | 'file',
            envConfig: Record<string, string> | null = null,
          ) => {
            const resourceList = coreFunctions!.core.getEpisodeData()!.resources;

            if (searchBy === 'label') {
              return resourceList.getResourceByLabel(
                resourceId, envConfig, undefined, undefined, resourceType,
              );
            }
            return resourceList.getResourceById(
              resourceId, envConfig, undefined, undefined, resourceType,
            );
          },
          fetchResource: async (
            resourceId: string,
            cacheLevel: ResourceLoaderCacheLevel,
          ) => {
            const { resources } = coreFunctions!.core.getEpisodeData()!;

            const resourceDetail = resources.filesById.get(resourceId);

            if (!resourceDetail) {
              throw new Error(`Resource not found: ${resourceId}`);
            }

            const url = await resources.getResourceById(resourceId);

            if (!url) return null;

            try {
              const result = await coreFunctions!.core.resourceLoader.fetchResource({
                id: resourceDetail.id,
                cacheLevel,
                url,
              });

              return result;
            } catch (e) {
              log('Unable to fetch the resource');
            }
          },
          lockMouse: () => {
            // This should do nothing when since the interaction can lock mouse itself
          },
          unlockMouse: () => {
            // This should do nothing when since the interaction can lock mouse itself
          },
          getResourceList: () => {
            const { resources } = coreFunctions!.core.getEpisodeData()!;

            return [...resources.items];
          },
          requestTextFieldInput: () => {
            // This should do nothing when since the interaction can create textField itself
          },
          showDialogArea: () => {
            coreFunctions!.core.dialogManager.dialogVisible.set(true);
          },
          hideDialogArea: () => {
            coreFunctions!.core.dialogManager.dialogVisible.set(false);
          },
          sendDialogMessage: (messages) => {
            coreFunctions!.core.dialogManager.sendDialogMessage(messages);
          },
          setDialogActions: (actions) => {
            coreFunctions!.core.dialogManager.dialogActions.set(actions);
          },
          clearDialogActions: () => {
            coreFunctions!.core.dialogManager.dialogActions.set(null);
          },
          addAudios: forwardToCoreFunctions('addAudios'),
          playAudio: forwardToCoreFunctions('playAudio'),
          pauseAudio: forwardToCoreFunctions('pauseAudio'),
          stopAudio: forwardToCoreFunctions('stopAudio'),
          seekAudio: forwardToCoreFunctions('seekAudio'),
          fadeAudio: forwardToCoreFunctions('fadeAudio'),
          updateAudioVolume: forwardToCoreFunctions('updateAudioVolume'),
          updateAudioLoop: forwardToCoreFunctions('updateAudioLoop'),
          addSubtitleToAudio: forwardToCoreFunctions('addSubtitleToAudio'),
          gotoEpisode: (episode, forceReload, assetOrder, assetTime) => {
            const externalGotoEpisode = coreFunctions?.core
              .getUserImplementedFunctions()
              .gotoEpisode;

            if (!externalGotoEpisode) {
              console.warn('gotoEpisode not implemented');
              return;
            }

            externalGotoEpisode(
              coreFunctions!.core.seek,
              episode,
              forceReload,
              assetOrder,
              assetTime,
            );
          },
          finishEpisode: forwardToUserImplementedFunctions('finishEpisode'),
          gotoSeries: forwardToUserImplementedFunctions('gotoSeries'),
          unlockEpisode: forwardToUserImplementedFunctions('unlockEpisode'),
          unlockAsset: forwardToUserImplementedFunctions('unlockAsset'),
          getSavedData: forwardToUserImplementedFunctions('getSavedData'),
          setSavedData: forwardToUserImplementedFunctions('setSavedData'),
          getPlayerData: (slotId) => {
            return window.localStorage.getItem(
              `@recative/act-player/player-data/${slotId}`,
            );
          },
          setPlayerData: (slotId, data) => {
            window.localStorage.setItem(
              `@recative/act-player/player-data/${slotId}`,
              data,
            );
          },
          requestPayment: forwardToUserImplementedFunctions('requestPayment'),
          showVideoModal: forwardToUserImplementedFunctions('showVideoModal'),
          logDebugMessage: forwardToUserImplementedFunctions('logDebugMessage'),
          getManagedCoreState: forwardToCoreFunctions('getManagedCoreState'),
          addManagedCoreState: forwardToCoreFunctions('addManagedCoreState'),
          deleteManagedCoreState: forwardToCoreFunctions(
            'deleteManagedCoreState',
          ),
          clearCoreState: forwardToCoreFunctions('clearCoreState'),
          customizedActionRequest: forwardToUserImplementedFunctions('customizedActionRequest'),
          requireQueuedTask: (taskId: string) => {
            if (!coreFunctions) {
              throw new TypeError('Core functions are not ready');
            }
            coreFunctions.requireQueuedTask(taskId, id);
          },
          createSequence: forwardToCoreFunctions('createSequence'),
          startSequence: forwardToCoreFunctions('startSequence'),
          showSequence: forwardToCoreFunctions('showSequence'),
          hideSequence: forwardToCoreFunctions('hideSequence'),
        } as Partial<HostFunctions>,
        {
          get(target, prop) {
            if (prop in target) {
              return target[prop as keyof HostFunctions];
            }
            throw new Error(`Not implemented host function:${prop.toString()}`);
          },
        },
      ) as HostFunctions,
      actPointTag,
    );
    startActPoint();
  };

  const removeActPointTag = () => {
    $actPoint = null;
  };

  const setActPointReady = () => {
    actPointReady = true;
  };

  const setActPointShown = () => {
    actPointShown = true;
  };

  const controller: Partial<ComponentFunctions> = {
    showContent: (contentId) => {
      if (contentId !== id) return;

      setActPointShown();
      connector?.connector.show();
    },
    play() {
      connector?.connector.play();
    },
    pause() {
      connector?.connector.pause();
    },
    resume() {
      connector?.connector.play();
    },
    suspend() {
      connector?.connector.pause();
    },
    handleDialogActionTrigger(action) {
      connector?.connector.dialogActionTriggered(action);
    },
    destroyItself() {
      connector?.channel.destroy();
      connector = null;
      $actPoint!.src = 'about:blank';
      $actPoint = null;
    },
    runQueuedTask(taskId: string) {
      if (!connector) {
        throw new TypeError('Connector not initialized');
      }

      return connector.connector.runQueuedTask(taskId);
    },
    sequenceEnded(sequenceId:string) {
      return connector?.connector.sequenceEnded(sequenceId);
    },
  };

  const setCoreFunctions = (x: CoreFunctions) => {
    coreFunctions = x;

    globalThis.setTimeout(() => {
      x.core.envVariableManager.envVariableAtom.subscribe((envVariable) => {
        // Here is something tricky, the strict mode of React
        // will force this variable being initialize for two
        // times, previous instance will be destroyed and the
        // connector will also be unavailable.
        // So, connector could be undefined, and we need to
        // ignore this call.
        connector?.connector.updateEnvironment(envVariable);
      });
    }, 0);
  };

  return {
    controller,
    destroyConnector: () => connector?.destroy(),
    setActPointTag,
    removeActPointTag,
    setActPointReady,
    setActPointShown,
    setCoreFunctions,
  };
};
