/* eslint-disable no-nested-ternary */
/* eslint-disable class-methods-use-this */

import { PersistenceAdapter, PersistenceAdapterMode } from './typings';

const globalScope =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window === 'undefined'
    ? window
      ? typeof global === 'undefined'
      : global
    : {};

export class LocalStorageNotAvailableError extends Error {
  name = 'LocalStorageNotAvailableError';

  constructor() {
    super('localStorage is not available');
  }
}

export const ensureLocalStorage = () => {
  if (!('localStorage' in globalScope)) {
    throw new LocalStorageNotAvailableError();
  }
};

/**
 * A loki persistence adapter which persists to web browser's local storage
 * object
 */
export class LocalStorageAdapter
  implements PersistenceAdapter<PersistenceAdapterMode.Default>
{
  mode = PersistenceAdapterMode.Default as const;

  /**
   * Load data from localStorage
   *
   * @param databaseName - the name of the database to load
   */
  loadDatabase = async (databaseName: string) => {
    ensureLocalStorage();
    return Promise.resolve(localStorage.getItem(databaseName));
  };

  /**
   * save data to localStorage, will throw an error if the file can't be saved
   * might want to expand this to avoid data loss on partial save
   *
   * @param databaseName - the filename of the database to load
   */
  saveDatabase = async (databaseName: string, databaseString: string) => {
    ensureLocalStorage();
    return Promise.resolve(localStorage.setItem(databaseName, databaseString));
  };

  /**
   * delete the database from localStorage, will throw an error if it
   * can't be deleted
   * @param databaseName - the filename of the database to delete
   */
  deleteDatabase = async (databaseName: string) => {
    ensureLocalStorage();
    localStorage.removeItem(databaseName);
    return Promise.resolve();
  };
}
