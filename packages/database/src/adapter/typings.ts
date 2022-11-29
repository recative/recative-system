import type { Database } from '../Database';

export enum PersistenceAdapterMode {
  Reference = 'reference',
  Incremental = 'incremental',
  Default = 'default'
}

export type SaveDatabaseImplementation<Mode extends PersistenceAdapterMode> =
  Mode extends PersistenceAdapterMode.Incremental
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fileName: string, getDatabaseCopy: () => Database<any>) => Promise<void>
    : Mode extends PersistenceAdapterMode.Reference
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fileName: string, databaseCopy: Database<any>) => Promise<void>
    : (fileName: string, serializedDatabase: string) => Promise<void>;

export abstract class PersistenceAdapter<Mode extends PersistenceAdapterMode> {
  abstract mode: Mode;

  abstract loadDatabase(fileName: string): Promise<
    Mode extends PersistenceAdapterMode.Reference
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        string | null | Database<any>
      : string | null
  >;

  abstract saveDatabase: SaveDatabaseImplementation<Mode>;

  abstract deleteDatabase(fileName: string): Promise<void>;
}
