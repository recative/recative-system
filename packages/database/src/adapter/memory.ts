import { PersistenceAdapter, PersistenceAdapterMode } from './typings';

export interface IHashStore {
  saveCount: number;
  lastSave: Date;
  value: string;
}

/**
 * In in-memory persistence adapter for an in-memory database.
 * This simple 'key/value' adapter is intended for unit testing and diagnostics.
 */
export class LokiMemoryAdapter
  implements PersistenceAdapter<PersistenceAdapterMode.Default>
{
  mode = PersistenceAdapterMode.Default as const;

  hashStore = new Map<string, IHashStore>();

  /**
   * Loads a serialized database from its in-memory store.
   *
   * @param databaseName - name of the database (fileName/keyName)
   */
  loadDatabase = (databaseName: string) => {
    return new Promise<string | null>((resolve) => {
      const hash = this.hashStore.get(databaseName);
      if (hash) {
        resolve(hash.value);
      } else {
        // database doesn't exist, return falsy
        resolve(null);
      }
    });
  };

  /**
   * Saves a serialized database to its in-memory store.
   *
   * @param databaseName - name of the database (fileName/keyName)
   */
  saveDatabase = (databaseName: string, databaseString: string) => {
    return new Promise<void>((resolve) => {
      const hash = this.hashStore.get(databaseName);

      this.hashStore.set(databaseName, {
        saveCount: (hash?.saveCount ?? 0) + 1,
        lastSave: new Date(),
        value: databaseString
      });

      resolve();
    });
  };

  /**
   * Deletes a database from its in-memory store.
   *
   * @param {string} databaseName - name of the database (fileName/keyName)
   */
  deleteDatabase = (databaseName: string) => {
    this.hashStore.delete(databaseName);
    return Promise.resolve();
  };
}
