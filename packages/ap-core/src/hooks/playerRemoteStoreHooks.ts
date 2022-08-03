import type { Runtype } from 'runtypes';
import debug from 'debug';

import { useStore, useContext } from './baseHooks';
import { useHostFunctions } from './hostFunctionsHooks';
import { AtomDefinition } from '../core/AtomStore';
import type { AtomName } from '../core/AtomStore';

const logRemoteStore = debug('ap:remote-store');

const useRemoteStoreInitializer = () => {
  const context = useContext();
  const { remoteStoreRegistry } = context;
  const { connector } = useHostFunctions();

  const initialize = <T>(
    slotId: string,
    fallbackValue: T,
    localStorageStoreKey: string,
    typeGuard: Runtype<T>,
  ) => {
    const storedItem = remoteStoreRegistry.getAtom(slotId) as AtomName<T>;

    if (storedItem) return storedItem;

    let localStorageCache: T | null = null;

    try {
      const localCacheString = localStorage.getItem(localStorageStoreKey);
      if (localCacheString) {
        localStorageCache = JSON.parse(localCacheString);
      }
    } catch (e) {
      logRemoteStore(`Unable to parse local cache of ${slotId}`, e);
    }

    const initialValue = typeGuard.guard(localStorageCache)
      ? localStorageCache
      : fallbackValue;

    const remoteItemName = AtomDefinition(initialValue);
    const [, _setRemoteItem] = useStore(remoteItemName);

    remoteStoreRegistry.register(slotId, remoteItemName);

    connector
      .getSavedData(slotId)
      .then((remoteData) => {
        const dataValid = typeGuard.guard(remoteData);
        if (!dataValid) {
          logRemoteStore(`Type checking request for slot '${slotId}' failed!`);
        }

        _setRemoteItem(dataValid ? (remoteData as T) : initialValue);
      })
      .catch((error) => {
        logRemoteStore(`Remote request for slot '${slotId}' failed!`, error);
        _setRemoteItem(initialValue);
      });

    return remoteItemName;
  };

  return initialize;
};

export const RemoteAtomDefinition = <T>(
  slotId: string,
  fallbackValue: T,
  typeGuard: Runtype<T>,
): RemoteAtomName<T> => Object.freeze({ slotId, fallbackValue, typeGuard });

export interface RemoteAtomName<T> {
  slotId: string;
  fallbackValue: T;
  typeGuard: Runtype<T>;
}

export const useRemoteStore = <T>(
  atomDefinition: RemoteAtomName<T>,
  triggerCallbackWhileAddingListener = false,
) => {
  const { connector } = useHostFunctions();
  const { slotId, fallbackValue, typeGuard } = atomDefinition;

  const initializeRemoteStore = useRemoteStoreInitializer();

  const localStorageStoreKey = `ap-remote-store-local-cache--${slotId}`;

  const atomName = initializeRemoteStore<T>(
    slotId,
    fallbackValue,
    localStorageStoreKey,
    typeGuard,
  );

  const [getRemoteItem, _setRemoteItem, _subscribeRemoteItemUpdate] = useStore(atomName);

  const setRemoteItem = (x: T) => {
    localStorage.setItem(localStorageStoreKey, JSON.stringify(x));

    connector.setSavedData(slotId, x);

    _setRemoteItem(x);
  };

  const subscribeRemoteItemUpdate = (handler: (x: T) => void) => {
    _subscribeRemoteItemUpdate(handler);

    if (triggerCallbackWhileAddingListener) {
      handler(getRemoteItem());
    }
  };

  return [getRemoteItem, setRemoteItem, subscribeRemoteItemUpdate] as const;
};
