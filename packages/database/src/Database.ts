import EventTarget from '@ungap/event-target';
import { OpenPromise } from '@recative/open-promise';

import { Collection, ICollectionDocument } from './Collection';
import { deepFreeze } from './utils/freeze';
import { copyProperties } from './utils/copyProperties';
import { serializeReplacer } from './utils/serializeReplacer';
import { Environment, getEnv } from './utils/getEnv';
import type {
  ICollectionOptions,
  ICollectionSummary,
  ICollectionChange,
} from './Collection';
import { delay } from './utils/delay';
import { CloneMethod } from './utils/clone';
import { MemoryAdapter } from './adapter/memory';
import { PersistenceAdapter, PersistenceAdapterMode } from './adapter/typings';

export enum SerializationMethod {
  Normal = 'normal',
  Pretty = 'pretty',
  Destructured = 'destructured',
}

/**
 * Configuration for the database.
 * @field env - Override environment detection as 'NODEJS', 'BROWSER', 'CORDOVA'
 * @field verbose - Enable console output
 * @field autosave - Enables autosave
 * @field autosaveInterval - Time interval (in milliseconds) between saves
 *        (if dirty)
 * @field autoLoad - Enables auto load on database instantiation
 * @field autoLoadCallback - User callback called after database load
 * @field autosaveCallback - User callback called after database saved
 * @field adapter - An instance of a database persistence adapter
 * @field serializationMethod - How to serialize the data
 * @field destructureDelimiter - String delimiter used for destructured
 *        serialization
 * @field throttledSaves - debounces multiple calls to to saveDatabase reducing
 *        number of disk I/O operations and guaranteeing proper serialization of
 *        the calls.
 */
export interface IDatabaseOptions<T extends PersistenceAdapterMode> {
  env: Environment;
  verbose: boolean;
  autosave: boolean;
  autosaveInterval: number | null;
  autoLoad: boolean;
  autoLoadCallback?: () => void;
  autosaveCallback?: () => void;
  adapter: PersistenceAdapter<T> | null;
  serializationMethod: SerializationMethod;
  destructureDelimiter: string;
  throttledSaves: boolean;
}

const DEFAULT_OPTION = {
  verbose: false,
  autosave: false,
  autosaveInterval: 5000,
  autoLoad: false,
  adapter: null,
  serializationMethod: SerializationMethod.Normal,
  destructureDelimiter: '$<\n',
  throttledSaves: true,
};

/**
 * Apply or override collection level settings
 * @field removeNonSerializable - nulls properties not safe for serialization.
 */
export interface ICopyDatabaseOptions {
  removeNonSerializable: boolean;
}

export interface ISerializeDatabaseOptions {
  serializationMethod: SerializationMethod;
}

/**
 * Output format options for use externally to database
 * @field partitioned - (default: false) whether db and each collection are
 *        separate
 * @field partition - can be used to only output an individual collection or
 *        db (-1)
 * @field delimited - (default: true) whether subitems are delimited or
 *        sub-arrays
 * @field delimiter - override default delimiter
 */
export interface ISerializeDestructedOptions {
  partitioned: boolean;
  partition: number;
  delimited: boolean;
  delimiter: string;
}

/**
 * used to determine output of method
 * @field delimited - whether to return single delimited string or an array
 * @field delimiter - (optional) if delimited, this is delimiter to use
 * @field collectionIndex -  specify which collection to serialize data for
 */
export interface ISerializeCollectionOptions {
  delimited: boolean;
  delimiter: string;
  collectionIndex: number;
}

/**
 * source format options
 * @field partitioned=false - whether db and each collection are separate
 * @field partition - can be used to deserialize only a single partition
 * @field delimited=true - whether subitems are delimited or sub-arrays
 * @field delimiter - override default delimiter
 */
export interface IDeserializeDestructuredOptions {
  partitioned: boolean;
  partition: number;
  delimited: boolean;
  delimiter: string;
}

/**
 * used to describe format of destructuredSource input
 * @field delimited - whether source is delimited string or an array
 * @field delimiter - if delimited, this is delimiter to use (if other than
 *        default)
 */
export interface IDeserializeCollectionOptions {
  delimited: boolean;
  delimiter: string;
  collectionIndex: number;
  partitioned: boolean;
}

export interface Proto<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): T;
}

export interface ILoadJSONCollectionConfiguration<T> {
  inflate: (
    source: T & ICollectionDocument,
    destination: T & ICollectionDocument
  ) => (T & ICollectionDocument) | void;
  Proto: Proto<T>;
}

/**
 * apply or override collection level settings
 * @field retainDirtyFlags - whether collection dirty flags will be preserved
 */
export interface ILoadJSONOptions<T = any> {
  throttledSaves: boolean;
  retainDirtyFlags: boolean;
  [collectionName: string]:
    | Partial<ILoadJSONCollectionConfiguration<T>>
    | boolean
    | string
    | number
    | null
    | Function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | PersistenceAdapter<any>;
}

/**
 * configuration options
 * @field recursiveWait - (default: true) if after queue is drained, another
 *        save was kicked off, wait for it
 * @field recursiveWaitLimit - (default: false) limit our recursive waiting to
 *        a duration
 * @field recursiveWaitLimitDelay - (default: 2000) cutoff in ms to stop
 *        recursively re-draining
 */
export interface IThrottledSaveDrainOptions {
  recursiveWait: boolean;
  recursiveWaitLimit: boolean;
  recursiveWaitLimitDelay: number;
}

/**
 * The main database class.
 */
export class Database<T extends PersistenceAdapterMode> extends EventTarget {
  options: IDatabaseOptions<T>;

  // We have to use any here since we really don't know anything about the data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly collections: Collection<any>[] = [];

  // persist version of code which created the database to the database.
  // could use for upgrade scenarios.
  readonly databaseVersion = 1.5;

  readonly engineVersion = 1.5;

  // autosave support (disabled by default)
  autosave = false;

  autosaveInterval = 5000;

  autosaveHandle: number | NodeJS.Timer | null = null;

  ignoreAutosave = false;

  throttledSaves = true;

  // currently keeping persistenceMethod and persistenceAdapter as database level
  // properties that will not or cannot be deserialized.
  // You are required to configure persistence every time you instantiate a database
  // object (or use default environment detection) in order to load the database
  // anyways.

  // retain reference to optional (non-serializable) persistenceAdapter instance
  persistenceAdapter: PersistenceAdapter<T> | null = null;

  // flags used to throttle saves
  protected throttledSavePending = false;

  protected readonly throttledCallbacks: OpenPromise<boolean>[] = [];

  // enable console output if verbose flag is set (disabled by default)
  readonly verbose: boolean;

  isIncremental = false;

  constructor(
    readonly fileName: string = 'database.db',
    options: Partial<IDatabaseOptions<T>> = {}
  ) {
    super();

    this.options = Object.freeze({
      ...DEFAULT_OPTION,
      env: getEnv(),
      ...options,
    });

    this.addEventListener('init', this.clearChanges);
    this.verbose = !!options.verbose;

    this.serialize = this.serialize.bind(this);

    this.configureOptions(options, true);
  }

  /**
   * Allows reconfiguring database options
   * @param options configuration options to apply to db object
   * @param initialConfig (internal) true is passed when ctor is invoking
   */
  configureOptions = (
    options: Partial<IDatabaseOptions<T>>,
    initialConfig: boolean = false
  ) => {
    // retain reference to optional persistence adapter 'instance'
    // currently keeping outside options because it can't be serialized
    this.persistenceAdapter = null;

    // process the options
    this.options = Object.freeze({
      ...DEFAULT_OPTION,
      env: getEnv(),
      ...options,
    });

    // if user passes adapter, set persistence mode to adapter and retain
    // persistence adapter instance
    if (options.adapter) {
      this.persistenceAdapter = options.adapter;
      this.options.adapter = null;

      // if true, will keep track of dirty ids
      this.isIncremental =
        this.persistenceAdapter?.mode === PersistenceAdapterMode.Incremental;
    }

    // if they want to load database on instantiation, now is a good time to
    // load... after adapter set and before possible autosave initiation.
    if (options.autoLoad && initialConfig) {
      // for auto load, let the constructor complete before firing callback

      delay(() => {
        this.loadDatabase(options).then(options.autoLoadCallback);
      });
    }

    if (
      this.options.autosaveInterval &&
      this.options.autosaveInterval !== null
    ) {
      this.autosaveDisable();
      this.autosaveInterval = this.options.autosaveInterval;
    }

    if (this.options.autosave) {
      this.autosaveDisable();
      this.autosave = true;

      if (this.options.autosaveCallback) {
        this.autosaveEnable().then(options.autosaveCallback);
      } else {
        this.autosaveEnable();
      }
    }

    if (this.options.throttledSaves) {
      this.throttledSaves = this.options.throttledSaves;
    }

    // if by now there is no adapter specified by user nor derived from
    // `persistenceMethod`: use sensible defaults
    if (this.persistenceAdapter === null) {
      throw new TypeError('Please specify a persistence adapter');
    }
  };

  /**
   * Copies 'this' database into a new Database instance. Object references are
   * shared to make it lightweight enough.
   *
   * @param options - apply or override collection level settings
   */
  copy = (options?: ICopyDatabaseOptions) => {
    // in case running in an environment without accurate environment detection,
    // pass 'NA'
    const databaseCopy = new Database(this.fileName, {
      adapter: new MemoryAdapter(),
    });

    // currently inverting and letting loadJSONObject do most of the work
    databaseCopy.loadJSONObject(this, { retainDirtyFlags: true });

    // since our JSON serializeReplacer is not invoked for reference database
    // adapters, this will let us mimic
    if (options?.removeNonSerializable) {
      databaseCopy.autosaveHandle = null;
      databaseCopy.persistenceAdapter = null;

      const collectionCount = databaseCopy.collections.length;
      for (let i = 0; i < collectionCount; i += 1) {
        // @ts-ignore let's refactor this later
        databaseCopy.collections[i].constraints = null;
        // @ts-ignore let's refactor this later
        databaseCopy.collections[i].ttl = null;
      }
    }

    return databaseCopy;
  };

  /**
   * Adds a collection to the database.
   * @param name - name of collection to add
   * @param options - options to configure collection with.
   */
  addCollection = <P extends object>(
    name: string,
    options?: Partial<ICollectionOptions<P>>
  ): Collection<P> => {
    let i;
    const len = this.collections.length;

    if (options && options.disableMeta === true) {
      if (options.disableChangesApi === false) {
        throw new TypeError(
          'disableMeta option cannot be passed as true when disableChangesApi is passed as false'
        );
      }
      if (options.disableDeltaChangesApi === false) {
        throw new TypeError(
          'disableMeta option cannot be passed as true when disableDeltaChangesApi is passed as false'
        );
      }
      if (typeof options.ttl === 'number' && options.ttl > 0) {
        throw new TypeError(
          'disableMeta option cannot be passed as true when ttl is enabled'
        );
      }
    }

    for (i = 0; i < len; i += 1) {
      if (this.collections[i].name === name) {
        return this.collections[i];
      }
    }

    const collection = new Collection<P>(name, options);
    // @ts-ignore: TODO: refactor this later
    collection.isIncremental = this.isIncremental;
    this.collections.push(collection);

    if (this.verbose) {
      // @ts-ignore: TODO: refactor this later
      collection.databaseConsoleWrapper = console;
    }

    return collection;
  };

  loadCollection = <P extends object>(collection: Collection<P>) => {
    if (!collection.name) {
      throw new Error('Collection must have a name property to be loaded');
    }

    this.collections.push(collection);
  };

  /**
   * Retrieves reference to a collection by name.
   * @param collectionName - name of collection to look up
   */
  getCollection = <U extends object>(
    collectionName: string
  ): Collection<U> | null => {
    const collectionCount = this.collections.length;

    for (let i = 0; i < collectionCount; i += 1) {
      if (this.collections[i].name === collectionName) {
        return this.collections[i];
      }
    }

    // no such collection
    this.dispatchEvent(
      new CustomEvent('warning', {
        detail: new TypeError(`collection ${collectionName} not found`),
      })
    );

    return null;
  };

  /**
   * Renames an existing database collection
   * @param oldName - name of collection to rename
   * @param newName - new name of collection
   */
  renameCollection = (oldName: string, newName: string) => {
    const collection = this.getCollection(oldName);

    if (collection) {
      collection.name = newName;
    }

    return collection;
  };

  /**
   * Returns a list of collections in the database.
   * @returns array of objects containing 'name', 'type', and 'count' properties.
   */
  listCollections = () => {
    const collections = new Array<ICollectionSummary>(this.collections.length);

    for (let i = 0; i < this.collections.length; i += 1) {
      collections[i] = {
        name: this.collections[i].name,
        type: this.collections[i].objType,
        count: this.collections[i].data.length,
      };
    }

    return collections;
  };

  /**
   * Removes a collection from the database.
   * @param collectionName - name of collection to remove
   */
  removeCollection = (collectionName: string) => {
    const collectionCount = this.collections.length;

    for (let i = 0; i < collectionCount; i += 1) {
      if (this.collections[i].name === collectionName) {
        this.collections.splice(i, 1);
        return;
      }
    }
  };

  /**
   * Serialize database to a string which can be loaded via
   * {@link Database#loadJSON}
   *
   * @returns Stringified representation of the database database.
   */
  serialize(options?: {
    serializationMethod: SerializationMethod.Normal;
  }): string;
  serialize(options?: {
    serializationMethod: SerializationMethod.Pretty;
  }): string;
  serialize(options?: {
    serializationMethod: SerializationMethod.Destructured;
  }): string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize(options?: ISerializeDatabaseOptions) {
    const serializeMethod =
      options?.serializationMethod ?? this.options.serializationMethod;

    // We are not using switch here for better debugging experience while
    // someone think some code went wrong here.
    if (serializeMethod === SerializationMethod.Normal) {
      return JSON.stringify(this, serializeReplacer);
    }

    if (serializeMethod === SerializationMethod.Pretty) {
      return JSON.stringify(this, serializeReplacer, 2);
    }

    if (serializeMethod === SerializationMethod.Destructured) {
      return this.serializeDestructured();
    }

    const result = JSON.stringify(this, serializeReplacer);
    return result;
  }

  toJson = this.serialize;

  /**
   * Database level destructured JSON serialization routine to allow alternate
   * serialization methods. Internally, Database supports destructuring via
   * database "serializationMethod' option and the optional PartitioningAdapter
   * class. It is also available if you wish to do your own structured
   * persistence or data exchange.
   */
  serializeDestructured = (
    options?: Partial<ISerializeDestructedOptions>
  ): string | string[] => {
    let result: string | string[];
    const reConstructed: string[] = [];

    const internalOptions = {
      partitioned: false,
      partition: -1,
      delimiter: this.options.destructureDelimiter,
      ...options,
    };

    // 'partitioned' along with 'partition' of 0 or greater is a request for
    // single collection serialization
    if (
      internalOptions.partitioned === true &&
      internalOptions.partition >= 0
    ) {
      return this.serializeCollection({
        delimited: internalOptions.delimited,
        delimiter: internalOptions.delimiter,
        collectionIndex: internalOptions.partition,
      });
    }

    // not just an individual collection, so we will need to serialize db
    // container via shallow copy
    let databaseCopy: Database<PersistenceAdapterMode.Default> | null =
      new Database(this.fileName, {
        adapter: new MemoryAdapter(),
      });

    databaseCopy.loadJSONObject(this);

    for (let i = 0; i < databaseCopy.collections.length; i += 1) {
      databaseCopy.collections[i].data = [];
    }

    // if we -only- wanted the db container portion, return it now
    if (
      internalOptions.partitioned === true &&
      internalOptions.partition === -1
    ) {
      // since we are deconstructing, override serializationMethod to normal for
      // here
      return databaseCopy.serialize({
        serializationMethod: SerializationMethod.Normal,
      });
    }

    // at this point we must be deconstructing the entire database
    // start by pushing db serialization into first array element
    reConstructed.push(
      databaseCopy.serialize({
        serializationMethod: SerializationMethod.Normal,
      })
    );

    databaseCopy = null;

    // push collection data into subsequent elements
    for (let i = 0; i < this.collections.length; i += 1) {
      result = this.serializeCollection({
        delimited: internalOptions.delimited,
        delimiter: internalOptions.delimiter,
        collectionIndex: i,
      });

      // NDA : Non-Delimited Array : one iterable concatenated array with empty
      // string collection partitions
      if (
        internalOptions.partitioned === false &&
        internalOptions.delimited === false
      ) {
        if (!Array.isArray(result)) {
          throw new TypeError(
            'A non-delimited, non partitioned collection serialization did not return an expected array'
          );
        }

        // Array.concat would probably duplicate memory overhead for copying strings.
        // Instead copy each individually, and clear old value after each copy.
        // Hopefully this will allow g.c. to reduce memory pressure, if needed.
        for (let j = 0; j < result.length; j += 1) {
          reConstructed.push(result[j]);
          result[j] = '';
        }

        reConstructed.push('');
      } else {
        if (Array.isArray(result)) {
          throw new TypeError(
            'Delimited serialize result should never be an array'
          );
        }
        reConstructed.push(result);
      }
    }

    // Reconstruct / present results according to four combinations : D, DA,
    // NDA, NDAA
    if (internalOptions.partitioned) {
      // DA : Delimited Array of strings [0] db [1] collection [n] collection
      // { partitioned: true, delimited: true }
      // useful for simple future adaptations of existing persistence adapters
      // to save collections separately
      if (internalOptions.delimited) {
        return reConstructed;
      }
      // NDAA: Non-Delimited Array with subArrays. db at [0] and collection
      // sub-arrays at [n] { partitioned: true, delimited : false }
      // This format might be the most versatile for 'rolling your own'
      // partitioned sync or save.
      // Memory overhead can be reduced by specifying a specific partition, but
      // at this code path they did not, so its all.

      return reConstructed;
    }

    // D: one big Delimited string { partitioned: false, delimited : true }
    // This is the method Database will use internally if 'destructured'.
    // Little memory overhead improvements but does not require multiple
    // asynchronous adapter call scheduling
    if (internalOptions.delimited) {
      // indicate no more collections
      reConstructed.push('');

      return reConstructed.join(internalOptions.delimiter);
    }
    // NDA: Non-Delimited Array : one iterable array with empty string
    // collection partitions { partitioned: false, delimited: false }
    // This format might be best candidate for custom synchronous syncs or saves

    // indicate no more collections
    reConstructed.push('');

    return reConstructed;
  };

  /**
   * Collection level utility method to serialize a collection in a
   * 'destructured' format
   *
   * @returns A custom, restructured aggregation of independent serializations
   *          for a single collection.
   */
  serializeCollection = (options?: Partial<ISerializeCollectionOptions>) => {
    const internalOptions = {
      delimited: true,
      ...options,
    };

    if (!internalOptions.collectionIndex) {
      throw new TypeError(
        "serializeCollection called without 'collectionIndex' option"
      );
    }

    const documentsCount =
      this.collections[internalOptions.collectionIndex].data.length;

    const resultLines: string[] = new Array(documentsCount);

    for (let i = 0; i < documentsCount; i += 1) {
      resultLines[i] = JSON.stringify(
        this.collections[internalOptions.collectionIndex].data[i]
      );
    }

    // D and DA
    if (internalOptions.delimited) {
      // indicate no more documents in collection (via empty delimited string)
      resultLines.push('');

      return resultLines.join(internalOptions.delimiter);
    }

    // NDAA and NDA
    return resultLines;
  };

  /**
   * Database level destructured JSON deserialization routine to minimize memory
   * overhead.
   * Internally, Database supports destructuring via database "serializationMethod'
   * option and the optional LokiPartitioningAdapter class. It is also available
   * if you wish to do your own structured persistence or data exchange.
   *
   * @param destructuredSource - destructured json or array to deserialize from
   * @param options - source format options
   *
   * @returns An object representation of the deserialized database, not yet
   *          applied to 'this' db or document array
   */
  deserializeDestructured = (
    destructuredSource: string | string[],
    options?: Partial<IDeserializeDestructuredOptions>
  ) => {
    const internalOptions = {
      partitioned: false,
      delimited: true,
      delimiter: this.options.destructureDelimiter,
      ...options,
    };

    let workingArray: string[] = [];
    let lineIndex = 1;
    let done = false;
    let currObject;

    // Partitioned
    // DA: Delimited Array of strings [0] db [1] collection [n] collection
    //     { partitioned: true, delimited: true }
    // NDAA: Non-Delimited Array with subArrays. db at [0] and collection
    //       sub-arrays at [n] { partitioned: true, delimited : false }
    // -or- single partition
    if (internalOptions.partitioned) {
      // handle single partition
      if (typeof internalOptions.partition === 'number') {
        // db only
        if (internalOptions.partition === -1) {
          return JSON.parse(destructuredSource[0]);
        }

        // single collection, return doc array
        return this.deserializeCollection(
          destructuredSource[internalOptions.partition + 1],
          internalOptions
        );
      }

      // Otherwise we are restoring an entire partitioned db
      const currentDatabase = JSON.parse(destructuredSource[0]);
      const collCount = currentDatabase.collections.length;
      for (let i = 0; i < collCount; i += 1) {
        // attach each collection doc-array to container collection data, add 1
        // to collection array index since db is at 0
        currentDatabase.collections[i].data = this.deserializeCollection(
          destructuredSource[i + 1],
          internalOptions
        );
      }

      return currentDatabase;
    }

    // Non-Partitioned
    // D: one big Delimited string { partitioned: false, delimited : true }
    // NDA: Non-Delimited Array : one iterable array with empty string
    //      collection partitions { partitioned: false, delimited: false }

    // D
    if (internalOptions.delimited) {
      if (Array.isArray(destructuredSource)) {
        throw new TypeError(
          'Delimited source can not be an array, this is a bug'
        );
      }

      workingArray = destructuredSource.split(internalOptions.delimiter);

      if (workingArray.length === 0) {
        return null;
      }
    } else {
      // NDA
      if (!Array.isArray(destructuredSource)) {
        throw new TypeError(
          'Non-delimited source can not be a string, this is a bug'
        );
      }
      workingArray = destructuredSource;
    }

    // first line is database and collection shells
    const currentDatabase = JSON.parse(workingArray[0]);
    const collectionCount = currentDatabase.collections.length;
    let collectionIndex = 0;

    workingArray[0] = '';

    while (!done) {
      // empty string indicates either end of collection or end of file
      if (workingArray[lineIndex] === '') {
        // if no more collections to load into, we are done
        collectionIndex += 1;
        if (collectionIndex > collectionCount) {
          done = true;
        }
      } else {
        currObject = JSON.parse(workingArray[lineIndex]);
        currentDatabase.collections[collectionIndex].data.push(currObject);
      }

      // lower memory pressure and advance iterator
      lineIndex += 1;
      workingArray[lineIndex] = '';
    }

    return currentDatabase;
  };

  /**
   * Collection level utility function to deserializes a destructured collection.
   *
   * @param destructuredSource - destructured representation of collection to inflate
   * @param options - used to describe format of destructuredSource input
   *
   * @returns an array of documents to attach to collection.data.
   */
  deserializeCollection = <P extends object>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    destructuredSource: string | string[] | Database<any>,
    options?: Partial<IDeserializeCollectionOptions>
  ) => {
    const internalOptions = {
      delimited: true,
      partitioned: false,
      delimiter: this.options.destructureDelimiter,
      ...options,
    };

    let stringArray = [];

    if (internalOptions.delimited) {
      if (typeof destructuredSource !== 'string') {
        throw new TypeError(
          'Delimited destructured source can not be an array'
        );
      }
      stringArray = destructuredSource.split(internalOptions.delimiter);
      stringArray.pop();
    } else {
      if (!Array.isArray(destructuredSource)) {
        throw new TypeError(
          'Non-delimited destructured source can not be a string'
        );
      }
      stringArray = destructuredSource;
    }

    return stringArray.map((x) => JSON.parse(x)) as (P & ICollectionDocument)[];
  };

  /**
   * Inflates a database database from a serialized JSON string
   *
   * @param serializedDb - a serialized database database string
   * @param options - apply or override collection level settings
   */
  loadJSON = <P extends object>(
    serializedDb: string,
    options?: Partial<ILoadJSONOptions<P>>
  ) => {
    let dbObject: unknown;
    if (serializedDb.length === 0) {
      dbObject = {};
    } else {
      // using option defined in instantiated db not what was in serialized db
      switch (this.options.serializationMethod) {
        case 'normal':
        case 'pretty':
          dbObject = JSON.parse(serializedDb);
          break;
        case 'destructured':
          dbObject = this.deserializeDestructured(serializedDb);
          break;
        default:
          dbObject = JSON.parse(serializedDb);
          break;
      }
    }

    this.loadJSONObject<P>(dbObject, options);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static isDatabaseObject = (x: unknown): x is Database<any> => {
    if (typeof x !== 'object') return false;
    if (!x) return false;

    if (!('collections' in x)) return false;

    const a = x as { collections: unknown };
    if (!Array.isArray(a.collections)) return false;

    if (!('throttledSaves' in x)) return false;

    return true;
  };

  /**
   * Inflates a database database from a JS object
   *
   * @param databaseObject - a serialized database database string
   * @param options - apply or override collection level settings
   */
  loadJSONObject = <P extends object>(
    databaseObject: unknown,
    options?: Partial<ILoadJSONOptions<P>>
  ) => {
    if (!Database.isDatabaseObject(databaseObject)) {
      throw new TypeError(
        'Invalid database object, the adapter is not implemented correctly'
      );
    }

    const internalOptions = {
      ...options,
    };

    // restore save throttled boolean only if not defined in options
    if (internalOptions && !internalOptions.throttledSaves !== undefined) {
      this.throttledSaves = databaseObject.throttledSaves;
    }

    this.collections.splice(0, this.collections.length);

    const makeLoader = (
      collection: Collection<P>
    ): ((
      x: P & ICollectionDocument,
      y?: P & ICollectionDocument
    ) => P & ICollectionDocument) => {
      const collectionOptions = internalOptions[collection.name];

      if (!collectionOptions) {
        throw new TypeError(
          `Unable to make loader for ${collection.name}, since it is not available in the options`
        );
      }

      if (
        typeof collectionOptions !== 'object' ||
        'mode' in collectionOptions
      ) {
        throw new TypeError(
          `Collection configuration of ${collection.name} is not valid`
        );
      }

      const inflater = collectionOptions.inflate || copyProperties;

      if (collectionOptions.Proto) {
        if (typeof inflater !== 'function') {
          throw new TypeError('Inflater must be a function if proto provided');
        }

        return (data: P & ICollectionDocument): P & ICollectionDocument => {
          const collectionInstance = new collectionOptions.Proto!(
            collection.name
          ) as unknown as P & ICollectionDocument;

          return (inflater(data, collectionInstance) ??
            collectionInstance) as P & ICollectionDocument;
        };
      }

      if (typeof inflater === 'function') {
        throw new TypeError(
          'Inflater must be a document if proto not provided'
        );
      }

      return inflater;
    };

    const collectionCount = databaseObject.collections
      ? databaseObject.collections.length
      : 0;

    for (let i = 0; i < collectionCount; i += 1) {
      // The type of this collection could be any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const collection: Collection<P> | undefined =
        databaseObject.collections[i];

      const copiedCollection = this.addCollection<P>(collection.name, {
        disableChangesApi: collection.disableChangesApi,
        disableDeltaChangesApi: collection.disableDeltaChangesApi,
        disableMeta: collection.disableMeta,
        disableFreeze:
          'disableFreeze' in collection ? collection.disableFreeze : true,
      });

      copiedCollection.adaptiveBinaryIndices =
        'adaptiveBinaryIndices' in collection
          ? collection.adaptiveBinaryIndices === true
          : false;
      copiedCollection.transactional = collection.transactional;
      copiedCollection.asyncListeners = collection.asyncListeners;
      copiedCollection.cloneObjects = collection.cloneObjects;
      copiedCollection.cloneMethod =
        collection.cloneMethod || CloneMethod.ParseStringify;
      copiedCollection.autoupdate = collection.autoupdate;
      copiedCollection.changes = collection.changes;
      // @ts-ignore Let refactor this later
      copiedCollection.dirtyIds = collection.dirtyIds || [];

      if (internalOptions && internalOptions.retainDirtyFlags === true) {
        copiedCollection.dirty = collection.dirty;
      } else {
        copiedCollection.dirty = false;
      }

      // load each element individually
      if (internalOptions && collection.name in internalOptions) {
        const loader = makeLoader(collection);

        for (let j = 0; j < collection.data.length; j += 1) {
          const newCollection = loader(collection.data[j]);
          copiedCollection.data[j] = newCollection;
          copiedCollection.addAutoUpdateObserver(newCollection);
          if (!copiedCollection.disableFreeze) {
            deepFreeze(copiedCollection.data[j]);
          }
        }
      } else {
        for (let j = 0; j < collection.data.length; j += 1) {
          copiedCollection.data[j] = collection.data[j];
          copiedCollection.addAutoUpdateObserver(copiedCollection.data[j]);
          if (!copiedCollection.disableFreeze) {
            deepFreeze(copiedCollection.data[j]);
          }
        }
      }

      copiedCollection.maxId =
        typeof collection.maxId === 'undefined' ? 0 : collection.maxId;
      if (typeof collection.binaryIndices !== 'undefined') {
        copiedCollection.binaryIndices = collection.binaryIndices;
      }
      if (typeof collection.transforms !== 'undefined') {
        copiedCollection.transforms = collection.transforms;
      }

      // regenerate unique indexes
      copiedCollection.uniqueNames = [];
      if ('uniqueNames' in collection) {
        copiedCollection.uniqueNames = collection.uniqueNames;
      }

      // in case they are loading a database created before we added dynamic views, handle undefined
      if (typeof collection.dynamicViews === 'undefined') continue;

      // reinflate DynamicViews and attached Result-sets
      for (let j = 0; j < collection.dynamicViews.length; j += 1) {
        const collectionDynamicView = collection.dynamicViews[j];

        const dynamicView = copiedCollection.addDynamicView(
          collectionDynamicView.name,
          collectionDynamicView.options
        );
        dynamicView.resultData = collectionDynamicView.resultData;
        dynamicView.resultsdirty = collectionDynamicView.resultsdirty;
        dynamicView.filterPipeline = collectionDynamicView.filterPipeline;
        dynamicView.sortCriteriaSimple =
          collectionDynamicView.sortCriteriaSimple;
        dynamicView.sortCriteria = collectionDynamicView.sortCriteria;
        dynamicView.sortFunction = null;
        dynamicView.sortDirty = collectionDynamicView.sortDirty;
        if (!copiedCollection.disableFreeze) {
          deepFreeze(dynamicView.filterPipeline);
          if (dynamicView.sortCriteriaSimple) {
            deepFreeze(dynamicView.sortCriteriaSimple);
          } else if (dynamicView.sortCriteria) {
            deepFreeze(dynamicView.sortCriteria);
          }
        }

        if (!dynamicView.resultSet) {
          throw new TypeError(
            `Dynamic view don not have a result set, this is a bug.`
          );
        }

        if (!collectionDynamicView.resultSet) {
          throw new TypeError(
            `Collection Dynamic view don not have a result set, this is a bug.`
          );
        }
        dynamicView.resultSet.filteredRows =
          collectionDynamicView.resultSet.filteredRows;
        dynamicView.resultSet.filterInitialized =
          collectionDynamicView.resultSet.filterInitialized;

        dynamicView.rematerialize({
          removeWhereFilters: true,
        });
      }

      // Upgrade Logic for binary index refactoring at version 1.5
      if (databaseObject.databaseVersion < 1.5) {
        // rebuild all indices
        copiedCollection.ensureAllIndexes(true);
        copiedCollection.dirty = true;
      }
    }
  };

  /**
   * Emits the close event. In autosave scenarios, if the database is dirty,
   * this will save and disable timer.
   * Does not actually destroy the db.
   */
  close = async () => {
    return new Promise((resolve) => {
      // for autosave scenarios, we will let close perform final save (if dirty)
      // For web use, you might call from window.onbeforeunload to shutdown
      // database, saving pending changes
      if (this.autosave) {
        this.autosaveDisable();
        if (this.autosaveDirty()) {
          this.saveDatabase().then(resolve);
        }
      }

      this.addEventListener('close', resolve, { once: true });
      this.dispatchEvent(new CustomEvent('close'));
    });
  };

  /**
   * Changes API
   *
  /**
   * The Changes API enables the tracking the changes occurred in the
   * collections since the beginning of the session,
   * so it's possible to create a differential dataset for synchronization
   * purposes (possibly to a remote db)
   */

  /**
   * (Changes API) : takes all the changes stored in each
   * collection and creates a single array for the entire database. If an array
   * of names of collections is passed then only the included collections will
   * be tracked.
   *
   * @param collectionNamesArray array of collection names. No arg means all
   *        collections are processed.
   * @returns  array of changes
   * @see private method createChange() in Collection
   */
  generateChangesNotification = (collectionNamesArray?: string[]) => {
    // This could be any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCollName = (collection: Collection<any>) => {
      return collection.name;
    };

    const selectedCollections =
      collectionNamesArray ?? this.collections.map(getCollName);

    // This could be any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let changes: ICollectionChange<any>[] = [];

    for (let i = 0; i < this.collections.length; i += 1) {
      const collection = this.collections[i];

      if (selectedCollections.includes(getCollName(collection))) {
        changes = changes.concat(collection.getChanges());
      }
    }

    return changes;
  };

  /**
   * (Changes API) - stringify changes for network transmission
   * @param collectionNamesArray array of collection names. No arg means all
   *        collections are processed.
   * @returns string representation of the changes
   */
  serializeChanges = (collectionNamesArray?: string[]) => {
    return JSON.stringify(
      this.generateChangesNotification(collectionNamesArray)
    );
  };

  /**
   * (Changes API) : clears all the changes in all collections.
   */
  clearChanges = () => {
    this.collections.forEach((collection) => {
      if (collection.flushChanges) {
        collection.flushChanges();
      }
    });
  };

  /**
   * Wait for throttledSaves to complete and invoke your callback when drained
   * or duration is met.
   *
   * @param options - configuration options
   */
  throttledSaveDrain = (options?: Partial<IThrottledSaveDrainOptions>) => {
    const now = new Date().getTime();

    if (!this.throttledSaves) {
      return Promise.resolve(true);
    }

    const internalOptions = {
      recursiveWait: true,
      recursiveWaitLimit: false,
      recursiveWaitLimitDuration: 2000,
      started: Date.now(),
      ...options,
    };

    // if save is not pending
    if (!this.throttledSaves || !this.throttledSavePending) {
      return Promise.resolve(true);
    }

    // if we want to wait until we are in a state where there are no pending
    // saves at all
    if (internalOptions.recursiveWait) {
      // queue the following meta callback for when it completes
      const recursiveTask: OpenPromise<boolean> = new OpenPromise<boolean>(
        (resolve) => {
          // if there is now another save pending...
          if (this.throttledSavePending) {
            // if we wish to wait only so long and we have exceeded limit of our
            // waiting, callback with false success value
            const deltaT = now - internalOptions.started;
            const exceedTimeLimit =
              deltaT > internalOptions.recursiveWaitLimitDuration;
            if (internalOptions.recursiveWaitLimit && exceedTimeLimit) {
              resolve(false);
              return;
            }
            // it must be ok to wait on next queue drain
            return this.throttledSaveDrain(internalOptions)?.then(resolve);
          }
          // no pending saves so callback with true success
          return resolve(true);
        },
        true
      );
      this.throttledCallbacks.push(recursiveTask);

      return recursiveTask;
    }
    // just notify when current queue is depleted
    return this.throttledCallbacks[this.throttledCallbacks.length - 1];
  };

  /**
   * Internal load logic, decoupled from throttling/contention logic
   *
   * @param options - not currently used (remove or allow overrides?)
   */
  loadDatabaseInternal = async (options?: Partial<ILoadJSONOptions>) => {
    // the persistenceAdapter should be present if all is ok, but check to be
    // sure.

    if (!this.persistenceAdapter) {
      throw new Error('persistenceAdapter not configured');
    }

    const databaseString = await this.persistenceAdapter.loadDatabase(
      this.fileName
    );

    if (typeof databaseString === 'string') {
      this.loadJSON(databaseString, options ?? {});

      this.dispatchEvent(
        new CustomEvent('loaded', {
          detail: { fileName: this.fileName, isEmpty: false },
        })
      );
      return null;
    }
    // falsy result means new database
    if (!databaseString) {
      this.dispatchEvent(
        new CustomEvent('loaded', {
          detail: { fileName: this.fileName, isEmpty: true },
        })
      );
      return null;
    }

    // if adapter has returned an js object (other than null or error)
    // attempt to load from JSON object
    if (typeof databaseString === 'object') {
      this.loadJSONObject(databaseString, options || {});
      this.dispatchEvent(
        new CustomEvent('loaded', {
          detail: { fileName: this.fileName, isEmpty: false },
        })
      );
      return null; // return null on success
    }

    throw new Error(`unexpected adapter response: ${databaseString}`);
  };

  /**
   * Handles manually loading from file system, local storage, or adapter (such
   * as indexed-db).
   * This method utilizes database configuration options (if provided) to determine
   * which persistence method to use, or environment detection (if configuration
   * was not provided).
   * To avoid contention with any throttledSaves, we will drain the save queue
   * first.
   *
   * If you are configured with autosave, you do not need to call this method
   * yourself.
   *
   * @param options - if throttling saves and loads, this controls how we drain
   *        save queue before loading
   * @example
   * db.loadDatabase({}, function(err) {
   *   if (err) {
   *     console.log("error : " + err);
   *   }
   *   else {
   *     console.log("database loaded.");
   *   }
   * });
   */
  loadDatabase = async (
    options?: Partial<
      IDatabaseOptions<T> & ILoadJSONOptions & IThrottledSaveDrainOptions
    >
  ) => {
    // if throttling disabled, just call internal
    if (!this.throttledSaves) {
      return this.loadDatabaseInternal(options);
    }

    // try to drain any pending saves in the queue to lock it for loading
    const success = await this.throttledSaveDrain(options);

    if (!success) {
      throw new Error(
        'Unable to pause save throttling long enough to read database'
      );
    }

    // pause/throttle saving until loading is done
    this.throttledSavePending = true;

    try {
      return await this.loadDatabaseInternal(options);
    } finally {
      if (this.throttledCallbacks.length === 0) {
        // now that we are finished loading, if no saves were throttled,
        // disable flag
        this.throttledSavePending = false;
      } else {
        // if saves requests came in while loading, kick off new save to kick
        // off resume saves
        this.saveDatabase();
      }
    }
  };

  /**
   * Internal save logic, decoupled from save throttling logic
   */
  saveDatabaseInternal = async () => {
    // the persistenceAdapter should be present if all is ok, but check to be
    // sure.
    if (!this.persistenceAdapter) {
      throw new Error('persistenceAdapter not configured');
    }

    // run incremental, reference, or normal mode adapters, depending on what's
    // available
    if (this.persistenceAdapter.mode === 'incremental') {
      let cachedDirty: [boolean, number[]][] | undefined;
      // ignore autosave until we copy database (only then we can clear dirty flags,
      // but if we don't do it now, autosave will be triggered a lot
      // unnecessarily)
      this.ignoreAutosave = true;
      try {
        await (
          this
            .persistenceAdapter as PersistenceAdapter<PersistenceAdapterMode.Incremental>
        ).saveDatabase(this.fileName, () => {
          this.ignoreAutosave = false;
          if (cachedDirty) {
            throw new Error('`getDatabaseCopy` called more than once');
          }

          const databaseCopy = this.copy({ removeNonSerializable: true });

          // remember and clear dirty ids -- we must do it before the save so
          // that if and update occurs between here and callback, it will get
          // saved later
          cachedDirty = this.collections.map((collection) => {
            return [
              collection.dirty,
              // @ts-ignore Let's fix this later
              collection.dirtyIds,
            ];
          });
          this.collections.forEach((collection) => {
            if (!this.throttledSavePending) {
              collection.dirty = false;
              // @ts-ignore Let's fix this later
              collection.dirtyIds = [];
            }
          });

          return databaseCopy;
        });
      } catch (error) {
        if (cachedDirty) {
          // roll back dirty IDs to be saved later
          for (let i = 0; i < this.collections.length; i += 1) {
            const collection = this.collections[i];

            const cached = cachedDirty[i];
            collection.dirty = collection.dirty || cached[0];
            // @ts-ignore: Let's fix this later
            collection.dirtyIds = collection.dirtyIds.concat(cached[1]);
          }
        }
      } finally {
        this.ignoreAutosave = false;
      }
    } else if (this.persistenceAdapter.mode === 'reference') {
      // TODO: dirty should be cleared here
      // filename may seem redundant but loadDatabase will need to expect this
      // same filename
      try {
        await (
          this
            .persistenceAdapter as PersistenceAdapter<PersistenceAdapterMode.Reference>
        ).saveDatabase(
          this.fileName,
          this.copy({ removeNonSerializable: true })
        );
      } finally {
        this.autosaveClearFlags();
      }
    } else {
      // otherwise just pass the serialized database to adapter
      // persistenceAdapter might be asynchronous, so we must clear `dirty`
      // immediately or autosave won't work if an update occurs between here and
      // the callback.
      // TODO: This should be stored and rolled back in case of DB save failure
      this.autosaveClearFlags();
      await (
        this
          .persistenceAdapter as PersistenceAdapter<PersistenceAdapterMode.Default>
      ).saveDatabase(this.fileName, this.serialize());
    }
  };

  /**
   * Handles manually saving to file system, local storage, or adapter (such as
   * indexed-db)
   * This method utilizes database configuration options (if provided) to determine
   * which persistence method to use, or environment detection (if configuration
   * was not provided).
   *
   * If you are configured with autosave, you do not need to call this method
   * yourself.
   *
   * @example
   * db.saveDatabase(function(err) {
   *   if (err) {
   *     console.log("error : " + err);
   *   }
   *   else {
   *     console.log("database saved.");
   *   }
   * });
   */
  saveDatabase = async () => {
    const cleanup = async () => {
      this.throttledSavePending = !!this.throttledCallbacks.length;

      if (!this.throttledCallbacks.length) return;

      const localPromises = this.throttledCallbacks;
      this.throttledCallbacks.splice(0, this.throttledCallbacks.length);

      await delay(async () => {
        try {
          await this.saveDatabaseInternal();

          localPromises.forEach((localPromise) => {
            localPromise.resolve(true);
          });
        } catch (error) {
          localPromises.forEach((localPromise) => {
            localPromise.reject(
              error instanceof Error ? error : new Error(`${error}`)
            );
          });

          // since this is called async, future requests may have come in,
          // if so.. kick off next save
          if (this.throttledCallbacks.length > 0) {
            this.saveDatabase();
          }
        }
      });
    };

    if (!this.throttledSaves) {
      try {
        await this.saveDatabaseInternal();

        return true;
      } finally {
        cleanup();
      }
    }

    if (this.throttledSavePending) {
      const pendingTask = new OpenPromise<boolean>();
      this.throttledCallbacks.push(pendingTask);
      return pendingTask;
    }

    this.throttledSavePending = true;
    try {
      await this.saveDatabaseInternal();

      return true;
    } finally {
      cleanup();
    }
  };

  /**
   * Alias of saveDatabase
   */
  save = this.saveDatabase;

  /**
   * Handles deleting a database from file system, localStorage, or adapter
   * (indexed-db)
   * This method utilizes database configuration options (if provided) to determine
   * which persistence method to use, or environment detection (if configuration
   * was not provided).
   */
  deleteDatabase = async () => {
    if (!this.persistenceAdapter) {
      throw new Error('persistenceAdapter not configured');
    }
    // the persistenceAdapter should be present if all is ok, but check to be
    // sure.
    if (this.persistenceAdapter !== null) {
      await this.persistenceAdapter.deleteDatabase(this.fileName);
    }
  };

  /**
   * autosaveDirty - check whether any collections are 'dirty' meaning we need
   * to save (entire) database
   *
   * @returns true if database has changed since last autosave, false if not.
   */
  autosaveDirty = () => {
    for (let idx = 0; idx < this.collections.length; idx += 1) {
      if (this.collections[idx].dirty) {
        return true;
      }
    }

    return false;
  };

  /**
   * autosaveEnable - begin a javascript interval to periodically save the
   * database.
   */
  autosaveEnable = async () => {
    this.autosave = true;

    let autoSaveDelay = 5000;

    if (
      typeof this.autosaveInterval !== 'undefined' &&
      this.autosaveInterval !== null
    ) {
      autoSaveDelay = this.autosaveInterval;
    }

    this.autosaveHandle = globalThis.setInterval(() => {
      // use of dirty flag will need to be hierarchical since mods are done at
      // collection level with no visibility of 'db' so next step will be to
      // implement collection level dirty flags set on insert/update/remove
      // along with level isDirty() function which iterates all collections to
      // see if any are dirty

      if (this.autosaveDirty() && !this.ignoreAutosave) {
        return this.saveDatabase();
      }
    }, autoSaveDelay);
  };

  /**
   * autosaveClearFlags - resets dirty flags on all collections.
   *    Called from saveDatabase() after db is saved.
   *
   */
  autosaveClearFlags = () => {
    if (this.throttledSavePending) {
      return;
    }

    for (let i = 0; i < this.collections.length; i += 1) {
      this.collections[i].dirty = false;
    }
  };

  /**
   * autosaveDisable - stop the autosave interval timer.
   */
  autosaveDisable = () => {
    if (
      typeof this.autosaveHandle !== 'undefined' &&
      this.autosaveHandle !== null
    ) {
      clearInterval(this.autosaveHandle);
      this.autosaveHandle = null;
    }
  };
}
