import {
  lens,
  LensResult,
  isDotNotation,
  ValidDotNotation,
  ValidSimpleLensField,
  DotNotation,
} from '@recative/lens';
import { Target } from '@recative/event-target';

import * as Comparators from './Comparators';

// eslint-disable-next-line import/no-cycle
import { ResultSet, TransformResult } from './ResultSet';
import { Operators } from './Operations';
import { DynamicView } from './DynamicView';
import { UniqueIndex } from './UniqueIndex';
import {
  CollectionDocumentDeleteEvent,
  CollectionDocumentDeleteEventName,
  CollectionDocumentInsertEvent,
  CollectionDocumentInsertEventName,
  CollectionDocumentPreInsertEvent,
  CollectionDocumentPreInsertEventName,
  CollectionDocumentPreUpdateEvent,
  CollectionDocumentPreUpdateEventName,
  CollectionDocumentUpdateEvent,
  CollectionDocumentUpdateEventName,
  ErrorEvent,
  ErrorEventName,
  ICollectionDocumentDeleteEventDetail,
  ICollectionDocumentInsertEventDetail,
  ICollectionDocumentPreInsertEventDetail,
  ICollectionDocumentPreUpdateEventDetail,
  ICollectionDocumentUpdateEventDetail,
  IErrorEventDetail,
  WarnEventName,
} from './Events';
import { sub, mean, parseBase10, standardDeviation } from './utils/math';

import type { IQuery, JoinKeyFunction } from './typings';
import type { Operator } from './Operations';
import type { TransformRequest } from './ResultSet';
import type { IDynamicViewOptions } from './DynamicView';

import { delay } from './utils/delay';
import { hasOwn } from './utils/hasOwn';
import { clone, CloneMethod } from './utils/clone';
import { freeze, deepFreeze, unFreeze } from './utils/freeze';
import { ensureMetadata, IDocumentMetadata } from './utils/ensureMetadata';
import { isObservable, observe, suspenseObserve } from './utils/observe';

export interface ICollectionChange<T extends object> {
  name: string;
  operation: CollectionOperation;
  object: T;
}

type MeaningfulPrimitive = string | boolean | number;

const isMeaningfulPrimitive = (x: unknown): x is MeaningfulPrimitive => {
  const type = typeof x;

  if (type === 'string') return true;
  if (type === 'boolean') return true;
  if (type === 'number') return true;

  return false;
};

const isObject = (x: unknown): x is Record<string, unknown> => {
  return typeof x === 'object' && !!x;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const NO_OP = (...x: unknown[]): unknown => {
  return 0;
};

/**
 * Options for initialize a collection.
 *
 * @field unique - array of property names to define unique constraints for
 * @field exact - array of property names to define exact constraints for
 * @field indices - array property names to define binary indexes for
 * @field asyncListeners - whether listeners are called asynchronously
 * @field disableMeta - set to true to disable meta property on documents
 * @field disableChangesApi - set to false to enable Changes Api
 * @field disableDeltaChangesApi - set to false to enable Delta Changes API
 *        (requires Changes API, forces cloning)
 * @field autoupdate - use Object.observe to update objects automatically
 * @field clone - specify whether inserts and queries clone to/from user
 * @field cloneMethod - 'parse-stringify', 'jquery-extend-deep', 'shallow',
 *        'shallow-assign'
 * @field ttl - age of document (in ms.) before document is considered
 *        aged/stale.
 * @field ttlInterval - time interval for clearing out 'aged' documents; not set
 *        by default.
 */
export interface ICollectionOptions<T> {
  unique: DotNotation<T>[];
  exact: string[];
  indices: DotNotation<T>[];
  adaptiveBinaryIndices: boolean;
  transactional: boolean;
  asyncListeners: boolean;
  disableMeta: boolean;
  disableChangesApi: boolean;
  disableDeltaChangesApi: boolean;
  autoupdate: boolean;
  clone: boolean;
  cloneMethod: CloneMethod;
  serializableIndices: boolean;
  disableFreeze: boolean;
  ttl?: number;
  ttlInterval?: number;
}

export const DEFAULT_COLLECTION_OPTIONS = {
  unique: [],
  exact: [],
  indices: [],
  adaptiveBinaryIndices: true,
  transactional: false,
  asyncListeners: false,
  disableMeta: false,
  disableChangesApi: true,
  disableDeltaChangesApi: true,
  autoupdate: false,
  clone: false,
  cloneMethod: CloneMethod.ParseStringify,
  serializableIndices: true,
  disableFreeze: true,
};

export interface ICollectionSummary {
  name: string;
  type: string;
  count: number;
}

export interface IWarningEventDetail {
  message: string;
}

export interface IConfigureCollectionOptions {
  adaptiveBinaryIndices: boolean;
}

export enum CollectionOperation {
  Update = 'U',
  Remove = 'R',
  Insert = 'I',
}

export interface ITtlStatus {
  age: number | null;
  ttlInterval: number | null;
  daemon: NodeJS.Timer | number | null;
}

export interface IBinaryIndex<P> {
  name: ValidSimpleLensField;
  dirty: boolean;
  values: P[];
}

export interface ICollectionDocument {
  $loki: number;
  meta: IDocumentMetadata;
}

/**
 * optional configuration object
 *
 * @param randomSampling - whether (faster) random sampling should be used
 * @param randomSamplingFactor - percentage of total rows to randomly sample
 * @param repair - whether to fix problems if they are encountered
 */
export interface ICheckCollectionIndexOptions {
  randomSampling: boolean;
  randomSamplingFactor: number;
  repair: boolean;
}

/**
 * configure clear behavior
 *
 * @param removeIndices - whether to remove indices in addition to data
 */
export interface IClearCollectionOptions {
  removeIndices: boolean;
}

export type FilterFunction<T> = (x: T & ICollectionDocument) => boolean;

/**
 * options to data() before input to your map function
 *
 * @param removeMeta - allows removing meta before calling mapFun
 * @param forceClones - forcing the return of cloned objects to your map object
 * @param forceCloneMethod - Allows overriding the default or collection
 *        specified cloning method.
 * */
export interface ICollectionEqJoinDataOptions {
  removeMeta: boolean;
  forceClones: boolean;
  forceCloneMethod: CloneMethod;
}

export interface ICollectionCommitLog<T> {
  timestamp: number;
  message: string;
  data: T;
}

export interface ICollectionEvents<T> {
  'pre-insert': ICollectionDocumentPreInsertEventDetail<T>;
  insert: ICollectionDocumentInsertEventDetail<T>;
  'pre-update': ICollectionDocumentPreUpdateEventDetail<T>;
  update: ICollectionDocumentUpdateEventDetail<T>;
  error: IErrorEventDetail;
  delete: ICollectionDocumentDeleteEventDetail<T>;
  warn: IWarningEventDetail;
}

/**
 * Collection class that handles documents of same type
 *
 * @param name - collection name
 * @param options - (optional) array of property names to be indicted OR a
 *        configuration object
 * @see {@link Database#addCollection} for normal creation of collections
 */
export class Collection<T extends object> extends Target<
  [
    typeof CollectionDocumentPreInsertEventName,
    typeof CollectionDocumentInsertEventName,
    typeof CollectionDocumentPreUpdateEventName,
    typeof CollectionDocumentUpdateEventName,
    typeof CollectionDocumentDeleteEventName,
    typeof ErrorEventName,
    typeof WarnEventName
  ]
> {
  options: ICollectionOptions<T>;

  /**
   * the data held by the collection
   */
  data: (T & ICollectionDocument)[] = [];

  /**
   * position->$loki index (built lazily)
   */
  idIndex: number[] | null = null;

  /**
   * user defined indexes, this field supports dot notation
   */
  binaryIndices = {} as Record<ValidSimpleLensField, IBinaryIndex<number>>;

  constraints = {
    // @ts-ignore: Let's fix this later
    unique: {} as Record<UniqueIndex<string>>,
    // @ts-ignore: Let's fix this later
    exact: {} as Record<string, ExactIndex<string>>,
  };

  createTime = Date.now();

  createStack = new Error().stack;

  /**
   * unique constraints contain duplicate object references, so they are not
   * persisted.
   * we will keep track of properties which have unique constraint applied
   * here, and regenerate lazily.
   */
  uniqueNames: ValidSimpleLensField[] = [];

  /**
   * transforms will be used to store frequently used query chains as a series
   * of steps which itself can be stored along with the database.
   */
  transforms: Record<string, TransformRequest<T>[]> = {};

  /**
   * the object type of the collection
   */
  objType: string;

  /**
   * in autosave scenarios we will use collection level dirty flags to determine
   * whether save is needed.
   * Currently, if any collection is dirty we will autosave the whole database
   * if autosave is configured.
   * defaulting to true since this is called from addCollection and adding a
   * collection should trigger save.
   */
  dirty = true;

  /**
   * private holders for cached data
   */
  private cachedIndex: number[] | null = null;

  private cachedBinaryIndex: Record<keyof T, IBinaryIndex<number>> | null =
    null;

  private cachedData: (T & ICollectionDocument)[] | null = null;

  private cachedDirtyIds: number[] | null = null;

  /**
   * if set to true we will optimally keep indices 'fresh' during
   * insert/update/remove ops (never dirty/never needs rebuild)
   * if you frequently intersperse insert/update/remove ops between find ops
   * this will likely be significantly faster option.
   */
  adaptiveBinaryIndices: boolean;

  /**
   * is collection transactional
   */
  transactional: boolean;

  /**
   * options to clone objects when inserting them
   */
  cloneObjects: boolean;

  /**
   * default clone method (if enabled) is parse-stringify
   */
  cloneMethod: CloneMethod;

  /**
   * option to make event listeners async, default is sync
   */
  asyncListeners: boolean;

  /**
   * if set to true we will not maintain a meta property for a document
   */
  readonly disableMeta: boolean;

  /**
   * disable track changes
   */
  disableChangesApi: boolean;

  /**
   * disable delta update object style on changes
   */
  disableDeltaChangesApi: boolean;

  /**
   * option to observe objects and update them automatically, ignored if
   * `Object.observe` is not supported
   */
  autoupdate: boolean;

  /**
   * by default, if you insert a document into a collection with binary indices,
   * if those indexed properties contain a DateTime we will convert to epoch
   * time format so that (across serializations) its value position will be the
   * same 'after' serialization as it was 'before'.
   */
  readonly serializableIndices: boolean;

  /**
   * option to deep freeze all documents
   */
  readonly disableFreeze: boolean;

  /**
   * option to activate a cleaner daemon - clears 'aged' documents at set
   * intervals.
   */
  readonly ttl: ITtlStatus = {
    age: null,
    ttlInterval: null,
    daemon: null,
  };

  /**
   * currentMaxId - change manually at your own peril!
   */
  maxId = 0;

  dynamicViews: DynamicView<T>[] = [];

  /**
   * changes are tracked by collection and aggregated by the db
   */
  changes: ICollectionChange<T>[] = [];

  /**
   * lightweight changes tracking (loki IDs only) for optimized db saving
   */
  private dirtyIds: number[] = [];

  protected consoleWrapper = {
    log: NO_OP,
    warn: NO_OP,
    error: NO_OP,
  };

  isIncremental = false;

  constructor(
    public name: string = 'Collection',
    options?: Partial<ICollectionOptions<T>>
  ) {
    super();

    this.options = {
      ...DEFAULT_COLLECTION_OPTIONS,
      ...options,
    };

    this.objType = name;

    // exact match and unique constraints
    // save names; actual index is built lazily
    this.options.unique.forEach((prop) => {
      this.uniqueNames.push(prop);
    });

    this.options.exact.forEach((prop) => {
      // @ts-ignore: Let's fix this later
      this.constraints.exact[prop] = new ExactIndex(prop);
    });

    this.adaptiveBinaryIndices = this.options.adaptiveBinaryIndices;

    this.transactional = this.options.transactional;

    this.cloneObjects = this.options.clone;

    this.cloneMethod = this.options.cloneMethod;

    this.asyncListeners = this.options.asyncListeners;

    this.disableMeta = this.options.disableMeta;

    this.disableChangesApi = this.options.disableChangesApi;

    this.disableDeltaChangesApi = this.options.disableDeltaChangesApi;

    this.autoupdate = this.options.autoupdate;

    this.serializableIndices = this.options.serializableIndices;

    this.disableFreeze = this.options.disableFreeze;

    this.chain = this.chain.bind(this);

    if (this.disableChangesApi) {
      this.disableDeltaChangesApi = true;
    }

    this.setTTL(this.options.ttl || -1, this.options.ttlInterval ?? null);

    // initialize optional user-supplied indices array ['age', 'lname', 'zip']
    for (let i = 0; i < this.options.indices.length; i += 1) {
      this.ensureIndex(this.options.indices[i]);
    }

    const handleDeleteEvent = ((
      event: CustomEvent<ICollectionDocumentDeleteEventDetail<T>>
    ) => {
      if (!this.disableChangesApi) {
        this.createChange(
          this.name,
          CollectionOperation.Remove,
          event.detail.document
        );
      }
    }) as unknown as EventListener;

    this.addEventListener('delete', handleDeleteEvent);

    const handleWarning = ((event: CustomEvent<IWarningEventDetail>) => {
      this.consoleWrapper.warn(event.detail.message);
    }) as unknown as EventListener;

    this.addEventListener('warning', handleWarning);

    // for de-serialization purposes
    this.flushChanges();

    this.insert = this.insert.bind(this);
    this.get = this.get.bind(this);
  }

  observerCallback = (data: T & ICollectionDocument) => {
    if (!data || !hasOwn(data, '$loki')) {
      if (isObservable(data)) {
        return suspenseObserve(data);
      }
    }

    this.update(data);
  };

  /**
   * Compare changed object (which is a forced clone) with existing object and
   * return the delta
   */
  getChangeDelta = <P extends object>(newObject: P, oldObject?: P) => {
    if (oldObject) {
      return this.getObjectDelta<P>(oldObject, newObject);
    }

    return JSON.parse(JSON.stringify(newObject));
  };

  getObjectDelta = <P extends object>(oldObject: P, newObject: P) => {
    const propertyNames = isObject(newObject)
      ? (Object.keys(newObject) as unknown as string[] as (keyof P)[])
      : null;

    if (
      propertyNames &&
      propertyNames.length &&
      !isMeaningfulPrimitive(newObject) &&
      isObject(oldObject) &&
      isObject(newObject)
    ) {
      const delta: Partial<T> = {};

      for (let i = 0; i < propertyNames.length; i += 1) {
        const propertyName = propertyNames[i];
        if (hasOwn(newObject, propertyName)) {
          if (
            !hasOwn(oldObject, propertyName) ||
            this.uniqueNames.includes(propertyName as unknown as keyof T) ||
            propertyName === '$loki' ||
            propertyName === 'meta'
          ) {
            Reflect.set(delta, propertyName, newObject[propertyName]);
          } else {
            const propertyDelta = this.getObjectDelta<P>(
              Reflect.get(oldObject, propertyName) as P,
              Reflect.get(newObject, propertyName) as P
            );

            if (
              typeof propertyDelta !== 'undefined' &&
              propertyDelta &&
              Object.keys(propertyDelta).length !== 0
            ) {
              Reflect.set(delta, propertyName, propertyDelta);
            }
          }
        }
      }
      return Object.keys(delta).length === 0 ? undefined : delta;
    }

    return oldObject === newObject ? undefined : newObject;
  };

  // clear all the changes
  flushChanges = () => {
    this.changes = [];
  };

  getChanges = () => {
    return this.changes;
  };

  setChangesApi = (enabled: boolean) => {
    this.disableChangesApi = !enabled;
    if (!enabled) {
      this.disableDeltaChangesApi = false;
    }
  };

  /*
   * For ChangeAPI default to clone entire object, for delta changes create
   * object with only differences (+ $loki and meta)
   */
  createChange = (
    name: string,
    operation: CollectionOperation,
    newObject: T,
    oldObject?: T
  ) => {
    this.changes.push({
      name,
      operation,
      object:
        operation === 'U' && !this.disableDeltaChangesApi
          ? this.getChangeDelta(newObject, oldObject)
          : JSON.parse(JSON.stringify(newObject)),
    });
  };

  insertMeta = (object: T) => {
    if (this.disableMeta || !object) {
      return;
    }

    // if batch insert
    if (Array.isArray(object)) {
      for (let i = 0; i < object.length; i += 1) {
        if (!hasOwn(object[i], 'meta')) {
          object[i].meta = {};
        }

        object[i].meta.created = new Date().getTime();
        object[i].meta.revision = 0;
      }

      return;
    }

    // single object
    ensureMetadata(object);
  };

  updateMeta = (object: T) => {
    if (this.disableMeta || !object) {
      return object;
    }

    let internalObject = ensureMetadata(object);

    if (!this.disableFreeze) {
      internalObject = unFreeze(internalObject);
      internalObject.meta = unFreeze(internalObject.meta);
    }
    internalObject.meta.updated = Date.now();
    internalObject.meta.revision += 1;

    return object;
  };

  /*
   * For ChangeAPI default to clone entire object, for delta changes create
   * object with only differences (+ $loki and meta)
   */
  createInsertChange = (object: T) => {
    this.createChange(this.name, CollectionOperation.Insert, object);
  };

  createUpdateChange = (object: T, newObject: T) => {
    this.createChange(this.name, CollectionOperation.Update, object, newObject);
  };

  insertMetaWithChange = (object: T) => {
    this.insertMeta(object);
    this.createInsertChange(object);
  };

  updateMetaWithChange = (object: T, oldObject: T) => {
    const result = this.updateMeta(object);
    this.createUpdateChange(result, oldObject);
    return object;
  };

  addAutoUpdateObserver = (object: T & ICollectionDocument) => {
    if (!this.autoupdate) {
      return;
    }

    observe<T & ICollectionDocument>(object, this.observerCallback);
  };

  /**
   * Adds a named collection transform to the collection
   *
   * @param name - name to associate with transform
   * @param transform - an array of transformation 'step' objects to save into
   *        the collection
   * @example
   * users.addTransform('progeny', [
   *   {
   *     type: 'find',
   *     value: {
   *       'age': {'$lte': 40}
   *     }
   *   }
   * ]);
   *
   * var results = users.chain('progeny').data();
   */
  addTransform = (name: string, transform: TransformRequest<T>[]) => {
    if (hasOwn(this.transforms, name)) {
      throw new TypeError('a transform by that name already exists');
    }

    this.transforms[name] = transform;
  };

  /**
   * Retrieves a named transform from the collection.
   * @param name - name of the transform to lookup.
   */
  getTransform = (name: string) => {
    return this.transforms[name];
  };

  /**
   * Updates a named collection transform to the collection
   *
   * @param name - name to associate with transform
   * @param transform - a transformation object to save into collection
   */
  setTransform = (name: string, transform: TransformRequest<T>[]) => {
    this.transforms[name] = transform;
  };

  /**
   * Removes a named collection transform from the collection
   *
   * @param name - name of collection transform to remove
   */
  removeTransform = (name: string) => {
    delete this.transforms[name];
  };

  // eslint-disable-next-line class-methods-use-this
  byExample = (template: IQuery<T>): IQuery<T> => {
    const query = [];

    const keys = Object.keys(template) as (keyof IQuery<T>)[];
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];

      const object = {} as IQuery<T>;
      object[key] = template[key];

      query.push(object);
    }
    return {
      $and: query,
    } as IQuery<T>;
  };

  findObject = <P extends object>(template: P) => {
    return this.findOne(this.byExample(template));
  };

  findObjects = <P extends object>(template: P) => {
    return this.find(this.byExample(template));
  };

  /* ----------------------------+
   | TTL daemon                  |
   +----------------------------*/

  ttlDaemonFuncGen = () => {
    const { age } = this.ttl;
    const ttlDaemon = () => {
      const now = Date.now();

      // @ts-ignore: Let's fix this later
      const toRemove = this.chain().where((member) => {
        const timestamp = member.meta.updated || member.meta.created;
        const diff = now - timestamp;
        return age ?? diff > 0;
      });
      toRemove.remove();
    };

    return ttlDaemon;
  };

  /**
   * Updates or applies collection TTL settings.
   * @param age - age (in ms) to expire document from collection
   * @param interval - time (in ms) to clear collection of aged documents.
   */
  setTTL = (age: number, interval: number | null) => {
    if (age < 0) {
      if (this.ttl.daemon !== null) {
        clearInterval(this.ttl.daemon);
      }
    } else if (interval !== null) {
      this.ttl.age = age;
      this.ttl.ttlInterval = interval;
      this.ttl.daemon = setInterval(this.ttlDaemonFuncGen(), interval);
    }
  };

  /* ----------------------------+
   | INDEXING                    |
   +----------------------------*/

  /**
   * create a row filter that covers all documents in the collection
   */
  prepareFullDocIndex = () => {
    const indexes = new Array<number>(this.data.length);
    for (let i = 0; i < this.data.length; i += 1) {
      indexes[i] = i;
    }
    return indexes;
  };

  /**
   * Will allow reconfiguring certain collection options.
   */
  configureOptions = (options: IConfigureCollectionOptions) => {
    const internalOptions = { ...options };

    if ('adaptiveBinaryIndices' in internalOptions) {
      this.adaptiveBinaryIndices = internalOptions.adaptiveBinaryIndices;

      // if switching to adaptive binary indices, make sure none are 'dirty'
      if (this.adaptiveBinaryIndices) {
        this.ensureAllIndexes();
      }
    }
  };

  /**
   * Ensure binary index on a certain field
   *
   * @param property - name of property to create binary index on
   * @param force - (Optional) flag indicating whether to construct index
   *        immediately
   */
  ensureIndex = (property: ValidSimpleLensField, force?: boolean) => {
    if (property === null || property === undefined) {
      throw new Error('Attempting to set index without an associated property');
    }

    if (this.binaryIndices[property] && !force) {
      if (!this.binaryIndices[property].dirty) return;
    }

    // if the index is already defined and we are using adaptiveBinaryIndices
    // and we are not forcing a rebuild, return.
    if (
      this.adaptiveBinaryIndices === true &&
      hasOwn(this.binaryIndices, property) &&
      !force
    ) {
      return;
    }

    const index: IBinaryIndex<number> = {
      name: property,
      dirty: true,
      values: this.prepareFullDocIndex(),
    };
    this.binaryIndices[property] = index;

    const wrappedComparer = ((key: ValidSimpleLensField, data: T[]) => {
      const propPath =
        typeof key === 'string' && isDotNotation(key) ? key.split('.') : false;

      return (a: number, b: number) => {
        let val1: T | undefined;
        let val2: T | undefined;

        if (propPath) {
          val1 = lens(Reflect.get(data, a), propPath, true);
          val2 = lens(Reflect.get(data, b), propPath, true);
        } else {
          val1 = Reflect.get(Reflect.get(data, a), key) as T | undefined;
          val2 = Reflect.get(Reflect.get(data, b), key) as T | undefined;
        }

        if (val1 !== val2) {
          if (Comparators.lt(val1, val2, false)) return -1;
          if (Comparators.gt(val1, val2, false)) return 1;
        }
        return 0;
      };
    })(property, this.data);

    index.values.sort(wrappedComparer);
    index.dirty = false;

    this.dirty = true; // for autosave scenarios
  };

  /**
   * Perform checks to determine validity/consistency of all binary indices
   *
   * @param options - optional configuration object
   * @returns array of index names where problems were found.
   * @example
   * // check all indices on a collection, returns array of invalid index names
   * const result = coll.checkAllIndexes({
   *   repair: true,
   *   randomSampling: true,
   *   randomSamplingFactor: 0.15
   * });
   * if (result.length > 0) {
   *   results.forEach(function(name) {
   *     console.log('problem encountered with index : ' + name);
   *   });
   * }
   */
  checkAllIndexes = (options?: Partial<ICheckCollectionIndexOptions>) => {
    const internalOptions = {
      randomSampling: false,
      randomSamplingFactor: 0.1,
      repair: false,
      ...options,
    };

    const results = [];
    const keys = Object.keys(this.binaryIndices) as (keyof T)[];

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];

      const result = this.checkIndex(key, internalOptions);
      if (!result) {
        results.push(key);
      }
    }

    return results;
  };

  /**
   * Perform checks to determine validity/consistency of a binary index
   *
   * @param  property - name of the binary-indexed property to check
   * @param  options - optional configuration object
   * @returns  whether the index was found to be valid (before
   * optional correcting).
   * @example
   * // full test
   * var valid = coll.checkIndex('name');
   * // full test with repair (if issues found)
   * valid = coll.checkIndex('name', { repair: true });
   * // random sampling (default is 10% of total document count)
   * valid = coll.checkIndex('name', { randomSampling: true });
   * // random sampling (sample 20% of total document count)
   * valid = coll.checkIndex(
   *   'name',
   *   { randomSampling: true, randomSamplingFactor: 0.20
   * });
   * // random sampling (implied boolean)
   * valid = coll.checkIndex('name', { randomSamplingFactor: 0.20 });
   * // random sampling with repair (if issues found)
   * valid = coll.checkIndex('name', { repair: true, randomSampling: true });
   */

  checkIndex = (
    property: keyof T,
    options?: Partial<ICheckCollectionIndexOptions>,
    usingDotNotation?: boolean
  ) => {
    const internalOptions = { ...options };
    // if 'randomSamplingFactor' specified but not 'randomSampling', assume true
    if (
      internalOptions.randomSamplingFactor &&
      internalOptions.randomSampling !== false
    ) {
      internalOptions.randomSampling = true;
    }

    internalOptions.randomSamplingFactor =
      internalOptions.randomSamplingFactor || 0.1;

    if (
      internalOptions.randomSamplingFactor < 0 ||
      internalOptions.randomSamplingFactor > 1
    ) {
      internalOptions.randomSamplingFactor = 0.1;
    }

    // make sure we are passed a valid binary index name
    if (!hasOwn(this.binaryIndices, property)) {
      throw new TypeError(
        `called checkIndex on property without an index: ${String(property)}`
      );
    }

    // if lazy indexing, rebuild only if flagged as dirty
    if (!this.adaptiveBinaryIndices) {
      this.ensureIndex(property);
    }

    const binaryIndicesValues = this.binaryIndices[property].values;
    const binaryIndicesCount = binaryIndicesValues.length;

    // if the index has an incorrect number of values
    if (binaryIndicesCount !== this.data.length) {
      if (internalOptions.repair) {
        this.ensureIndex(property, true);
      }
      return false;
    }

    if (binaryIndicesCount === 0) {
      return true;
    }

    let valid = true;

    if (binaryIndicesCount === 1) {
      valid = binaryIndicesValues[0] === 0;
    } else if (internalOptions.randomSampling) {
      // validate first and last
      if (
        !Operators.$lte(
          lens(
            this.data[binaryIndicesValues[0]],
            property,
            usingDotNotation
          ) as number,
          lens(
            this.data[binaryIndicesValues[1]],
            property,
            usingDotNotation
          ) as number
        )
      ) {
        valid = false;
      }

      if (
        !Operators.$lte(
          lens(
            this.data[binaryIndicesValues[binaryIndicesCount - 2]],
            property as string,
            usingDotNotation
          ) as number,
          lens(
            this.data[binaryIndicesValues[binaryIndicesCount - 1]],
            property as string,
            usingDotNotation
          ) as number
        )
      ) {
        valid = false;
      }

      // if first and last positions are sorted correctly with their nearest
      // neighbor, continue onto random sampling phase...
      if (valid) {
        // # random samplings = total count * sampling factor
        const iterations = Math.floor(
          (binaryIndicesCount - 1) * internalOptions.randomSamplingFactor
        );

        // for each random sampling, validate that the binary index is sequenced
        // properly with next higher value.
        for (let i = 0; i < iterations - 1; i += 1) {
          // calculate random position
          const position = Math.floor(Math.random() * (binaryIndicesCount - 1));
          if (
            !Operators.$lte(
              lens(
                this.data[binaryIndicesValues[position]],
                property,
                usingDotNotation
              ) as number,
              lens(
                this.data[binaryIndicesValues[position + 1]],
                property,
                usingDotNotation
              ) as number
            )
          ) {
            valid = false;
            break;
          }
        }
      }
    } else {
      // validate that the binary index is sequenced properly
      for (let i = 0; i < binaryIndicesCount - 1; i += 1) {
        if (
          !Operators.$lte(
            lens(
              this.data[binaryIndicesValues[i]],
              property,
              usingDotNotation
            ) as number,
            lens(
              this.data[binaryIndicesValues[i + 1]],
              property,
              usingDotNotation
            ) as number
          )
        ) {
          valid = false;
          break;
        }
      }
    }

    // if incorrectly sequenced and we are to fix problems, rebuild index
    if (!valid && internalOptions.repair) {
      this.ensureIndex(property, true);
    }

    return valid;
  };

  getBinaryIndexValues = (property: ValidSimpleLensField): unknown[] => {
    const indexValues = this.binaryIndices[property].values;
    const result: unknown[] = [];

    for (let i = 0; i < indexValues.length; i += 1) {
      result.push(lens(this.data[indexValues[i]], property, true) as unknown);
    }

    return result;
  };

  /**
   * Returns a named unique index
   *
   * @param field - indexed field name
   * @param force - if `true`, will rebuild index; otherwise, function may
   *        return null
   */
  getUniqueIndex = (field: ValidSimpleLensField, force?: boolean) => {
    const index = this.constraints.unique[field];
    if (!index && force) {
      return this.ensureUniqueIndex(field);
    }
    return index;
  };

  ensureUniqueIndex = <P extends ValidSimpleLensField>(field: P) => {
    const index = this.constraints.unique[field];
    if (!index) {
      // keep track of new unique index for regenerate after database (re)load.
      if (!this.uniqueNames.includes(field)) {
        this.uniqueNames.push(field);
      }
    }

    // if index already existed, (re)loading it will likely cause collisions, rebuild always
    const newIndex = new UniqueIndex<T>(field);
    this.constraints.unique[field] = newIndex;

    for (let i = 0; i < this.data.length; i += 1) {
      const document = this.data[i];
      newIndex.set(document);
    }
    return newIndex;
  };

  /**
   * Ensure all binary indices
   * @param force - whether to force rebuild of existing lazy binary indices
   */
  ensureAllIndexes = (force?: boolean) => {
    const binaryIndexKeys = Object.keys(this.binaryIndices) as (keyof T)[];

    for (let i = 0; i < binaryIndexKeys.length; i += 1) {
      const key = binaryIndexKeys[i];
      this.ensureIndex(key, force);
    }
  };

  /**
   * Internal method used to flag all lazy index as dirty
   */
  private flagBinaryIndexesDirty = () => {
    const binaryIndexKeys = Object.keys(this.binaryIndices) as (keyof T)[];

    for (let i = 0; i < binaryIndexKeys.length; i += 1) {
      const key = binaryIndexKeys[i];
      this.binaryIndices[key].dirty = true;
    }
  };

  /**
   * Quickly determine number of documents in collection (or query)
   * @param query - (optional) query object to count results of
   * @returns number of documents in the collection
   */
  count = (query?: IQuery<T>) => {
    if (!query) {
      return this.data.length;
    }

    return this.chain().find(query).filteredRows.length;
  };

  /**
   * Rebuild idIndex
   */
  ensureId = () => {
    if (this.idIndex) {
      return;
    }

    const index = new Array<number>(this.data.length);
    for (let i = 0; i < this.data.length; i += 1) {
      index[i] = this.data[i].$loki;
    }

    this.idIndex = index;
  };

  /**
   * Rebuild idIndex async with callback - useful for background syncing with a
   * remote server
   */
  ensureIdAsync = () => {
    return delay(() => this.ensureId());
  };

  /**
   * Add a dynamic view to the collection
   *
   * @param name - name of dynamic view to add
   * @param options - options to configure dynamic view with
   * @example
   * const progenyView = users.addDynamicView('progeny');
   * progenyView.applyFind({'age': {'$lte': 40}});
   * progenyView.applySimpleSort('name');
   *
   * const results = progenyView.data();
   */
  addDynamicView = (
    name: string = '',
    options?: Partial<IDynamicViewOptions>
  ) => {
    const dynamicView = new DynamicView(this, name, options);
    this.dynamicViews.push(dynamicView);

    return dynamicView;
  };

  /**
   * Remove a dynamic view from the collection
   * @param name - name of dynamic view to remove
   */
  removeDynamicView = (name: string) => {
    this.dynamicViews = this.dynamicViews.filter(
      (dynamicView) => dynamicView.name !== name
    );
  };

  /**
   * Look up dynamic view reference from within the collection
   *
   * @param name - name of dynamic view to retrieve reference of
   * @returns A reference to the dynamic view with that name
   * */
  getDynamicView = (name: string) => {
    for (let i = 0; i < this.dynamicViews.length; i += 1) {
      if (this.dynamicViews[i].name === name) {
        return this.dynamicViews[i];
      }
    }

    return null;
  };

  /**
   * Applies a 'mongo-like' find query object and passes all results to an
   * update function.
   * For filter function querying you should migrate to
   * [updateWhere()]{@link Collection#updateWhere}.
   *
   * @param filterObject - 'mongo-like' query object (or deprecated
   *        filterFunction mode)
   * @param updateFunction - update function to run against filtered documents
   * @memberof Collection
   */
  findAndUpdate = (
    filterObject: IQuery<T> | FilterFunction<T>,
    updateFunction: (
      x: T & ICollectionDocument
    ) => (T & ICollectionDocument) | void
  ) => {
    if (typeof filterObject === 'function') {
      return this.updateWhere(
        filterObject as FilterFunction<T>,
        updateFunction
      );
    }

    // This is because chain could return any types of data, but it's not the
    // case here
    return (
      this.chain()
        .find(filterObject)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updateFunction as any)
    );
  };

  /**
   * Applies a 'mongo-like' find query object removes all documents which match
   * that filter.
   *
   * @param filterObject - 'mongo-like' query object
   */
  findAndRemove = (filterObject: IQuery<T>) => {
    return this.chain().find(filterObject).remove();
  };

  /**
   * Adds object(s) to collection, ensure object(s) have meta properties, clone
   * it if necessary, etc.
   *
   * @param documents - the document (or array of documents) to be inserted
   * @param overrideAdaptiveIndices - (optional) if `true`, adaptive indices
   *        will be temporarily disabled and then fully rebuilt after batch.
   *        This will be faster for large inserts, but slower for small/medium
   *        inserts in large collections
   * @returns document or documents inserted
   * @example
   * users.insert({
   *     name: 'Odin',
   *     age: 50,
   *     address: 'Asgard'
   * });
   *
   * // alternatively, insert array of documents
   * users.insert([{ name: 'Thor', age: 35}, { name: 'Loki', age: 30}]);
   */
  insert(
    documents: T,
    overrideAdaptiveIndices?: boolean
  ): T & ICollectionDocument;
  insert(
    documents: T[],
    overrideAdaptiveIndices?: boolean
  ): (T & ICollectionDocument)[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(documents: any, overrideAdaptiveIndices?: boolean) {
    if (!Array.isArray(documents)) {
      return this.insertOne(documents);
    }

    // holder to the clone of the object inserted if collections is set to clone
    // objects

    // if not cloning, disable adaptive binary indices for the duration of the
    // batch insert, followed by lazy rebuild and re-enabling adaptive indices
    // after batch insert.
    const adaptiveBatchOverride =
      overrideAdaptiveIndices &&
      !this.cloneObjects &&
      this.adaptiveBinaryIndices &&
      Object.keys(this.binaryIndices).length > 0;

    if (adaptiveBatchOverride) {
      this.adaptiveBinaryIndices = false;
    }

    let results: (T & ICollectionDocument)[] = [];
    try {
      this.dispatchEvent(new CollectionDocumentPreInsertEvent(documents));

      for (let i = 0; i < documents.length; i += 1) {
        const document = this.insertOne(documents[i], true);
        if (!document) {
          return undefined;
        }
        results.push(document);
      }
    } finally {
      if (adaptiveBatchOverride) {
        this.ensureAllIndexes();
        this.adaptiveBinaryIndices = true;
      }
    }

    // at the 'batch' level, if clone option is true then emitted docs are
    // clones
    this.dispatchEvent(new CollectionDocumentInsertEvent(results));

    // if clone option is set, clone return values
    results = this.cloneObjects ? clone(results, this.cloneMethod) : results;

    return results;
  }

  /**
   * Adds a single object, ensures it has meta properties, clone it if
   * necessary, etc.
   *
   * @param document - the document to be inserted
   * @param bulkInsert - quiet pre-insert and insert event emits
   * @returns document or 'undefined' if there was a problem inserting it
   */
  insertOne = (document: T, bulkInsert?: boolean) => {
    let error = null;

    if (typeof document !== 'object') {
      error = new TypeError('Document needs to be an object');
    } else if (document === null) {
      error = new TypeError('Object cannot be null');
    }

    if (error !== null) {
      this.dispatchEvent(new ErrorEvent(error));
      throw error;
    }

    // if configured to clone, do so now... otherwise just use same obj reference
    let clonedDocument = this.cloneObjects
      ? clone(document, this.cloneMethod)
      : document;

    if (!this.disableFreeze) {
      clonedDocument = unFreeze(clonedDocument);
    }

    if (!this.disableMeta) {
      if (typeof clonedDocument.meta === 'undefined') {
        clonedDocument.meta = {
          revision: 0,
          created: 0,
        };
      } else if (!this.disableFreeze) {
        clonedDocument.meta = unFreeze(clonedDocument.meta);
      }
    }

    // both 'pre-insert' and 'insert' events are passed internal data reference
    // even when cloning insert needs internal reference because that is where
    // database itself listens to add meta
    if (!bulkInsert) {
      this.dispatchEvent(
        new CustomEvent('pre-insert', { detail: { documents: [document] } })
      );
    }

    if (!this.add(clonedDocument)) {
      return undefined;
    }

    // update meta and store changes if ChangesAPI is enabled
    // (moved from 'insert' event listener to allow internal reference to be
    // used)
    if (this.disableChangesApi) {
      this.insertMeta(clonedDocument);
    } else {
      this.insertMetaWithChange(clonedDocument);
    }

    if (!this.disableFreeze) {
      deepFreeze(clonedDocument);
    }

    // if cloning is enabled, emit insert event with clone of new object
    const result = this.cloneObjects
      ? clone(clonedDocument, this.cloneMethod)
      : clonedDocument;

    this.dirty = true; // for autosave scenarios

    if (!bulkInsert) {
      this.dispatchEvent(
        new CustomEvent('insert', { detail: { documents: [result] } })
      );
    }

    this.addAutoUpdateObserver(result);

    return result;
  };

  /**
   * Empties the collection.
   *
   * @param options - configure clear behavior
   */
  clear = (options?: Partial<IClearCollectionOptions>) => {
    const internalOptions = { ...options };

    this.data = [];
    this.idIndex = null;
    this.cachedIndex = null;
    this.cachedBinaryIndex = null;
    this.cachedData = null;
    this.maxId = 0;
    this.dynamicViews = [];
    this.dirty = true;
    this.constraints = {
      unique: {},
      exact: {},
    };

    // if removing indices entirely
    if (internalOptions.removeIndices === true) {
      this.binaryIndices = {} as Record<keyof T, IBinaryIndex<number>>;
      this.uniqueNames = [];
    } else {
      // clear indices but leave definitions in place
      // clear binary indices
      const keys = Object.keys(this.binaryIndices) as (keyof T)[];
      for (let i = 0; i < keys.length; i += 1) {
        const binaryIndexName = keys[i];
        this.binaryIndices[binaryIndexName].dirty = false;
        this.binaryIndices[binaryIndexName].values = [];
      }
    }
  };

  /**
   * Updates an object and notifies collection that the document has changed.
   *
   * @param {object} document - document to update within the collection
   */
  update = (
    document: (T & ICollectionDocument) | (T & ICollectionDocument)[]
  ) => {
    if (Array.isArray(document)) {
      // if not cloning, disable adaptive binary indices for the duration of the
      // batch update, followed by lazy rebuild and re-enabling adaptive indices
      // after batch update.
      const adaptiveBatchOverride =
        !this.cloneObjects &&
        this.adaptiveBinaryIndices &&
        Object.keys(this.binaryIndices).length > 0;

      if (adaptiveBatchOverride) {
        this.adaptiveBinaryIndices = false;
      }

      try {
        for (let k = 0; k < document.length; k += 1) {
          this.update(document[k]);
        }
      } finally {
        if (adaptiveBatchOverride) {
          this.ensureAllIndexes();
          this.adaptiveBinaryIndices = true;
        }
      }

      return;
    }

    // verify object is a properly formed document
    if (!hasOwn(document, '$loki')) {
      throw new TypeError(
        'Trying to update un-synced document. Please save the document first by using insert() or addMany()'
      );
    }

    try {
      this.startTransaction();
      const documents = this.get(document.$loki, true);

      if (!documents) {
        throw new Error('Trying to update a document not in collection.');
      }

      const oldDocument = documents[0]; // ref to existing obj
      const position = documents[1]; // position in data array

      // if configured to clone, do so now... otherwise just use same obj
      // reference
      let newInternal =
        this.cloneObjects ||
        (!this.disableDeltaChangesApi && this.disableFreeze)
          ? clone(document, this.cloneMethod)
          : document;

      this.dispatchEvent(new CollectionDocumentPreUpdateEvent(document));

      this.uniqueNames.forEach((key) => {
        this.getUniqueIndex(key, true).update(oldDocument, newInternal);
      });

      // operate the update
      this.data[position] = newInternal;

      if (newInternal !== document) {
        this.addAutoUpdateObserver(document);
      }

      // now that we can efficiently determine the data[] position of newly
      // added document, submit it for all registered DynamicViews to evaluate
      // for inclusion/exclusion
      for (let i = 0; i < this.dynamicViews.length; i += 1) {
        this.dynamicViews[i].evaluateDocument(position, false);
      }

      if (this.adaptiveBinaryIndices) {
        // for each binary index defined in collection, immediately update
        // rather than flag for lazy rebuild
        const binaryIndex = this.binaryIndices;
        const binaryIndexKeys = Object.keys(binaryIndex) as (keyof T)[];

        for (let i = 0; i < binaryIndexKeys.length; i += 1) {
          const key = binaryIndexKeys[i];
          this.adaptiveBinaryIndexUpdate(position, key);
        }
      } else {
        this.flagBinaryIndexesDirty();
      }

      if (!this.idIndex) {
        throw new TypeError('Id index is not ready for this collection');
      }

      this.idIndex[position] = newInternal.$loki;
      // this.flagBinaryIndexesDirty();

      if (this.isIncremental) {
        this.dirtyIds.push(newInternal.$loki);
      }

      this.commit();
      this.dirty = true; // for autosave scenarios

      // update meta and store changes if ChangesAPI is enabled
      if (this.disableChangesApi) {
        newInternal = this.updateMeta(newInternal);
      } else {
        newInternal = this.updateMetaWithChange(newInternal, oldDocument);
      }

      if (!this.disableFreeze) {
        deepFreeze(newInternal);
      }

      let newDocument;
      // if cloning is enabled, emit 'update' event and return with clone of
      // new object
      if (this.cloneObjects) {
        newDocument = clone(newInternal, this.cloneMethod);
      } else {
        newDocument = newInternal;
      }

      this.dispatchEvent(
        new CollectionDocumentUpdateEvent(newDocument, oldDocument)
      );
      return newDocument;
    } catch (error) {
      this.rollback();
      this.consoleWrapper.error(error);
      this.dispatchEvent(new ErrorEvent(error));
      throw error; // re-throw error so user does not think it succeeded
    }
  };

  /**
   * Add object to collection
   */
  add = (document: T) => {
    // if parameter isn't object exit with throw
    if (typeof document !== 'object') {
      throw new TypeError('Object being added needs to be an object');
    }
    // if object you are adding already has id column it is either already in
    // the collection or the object is carrying its own 'id' property.  If it
    // also has a meta property, then this is already in collection so throw
    // error, otherwise rename to originalId and continue adding.
    if (hasOwn(document, '$loki')) {
      throw new TypeError(
        'Document is already in collection, please use update()'
      );
    }

    const newDocument = { ...document } as T & ICollectionDocument;

    // try adding object to collection
    try {
      this.startTransaction();

      if (
        typeof this.maxId !== 'number' ||
        Number.isNaN(this.maxId) ||
        !Number.isFinite(this.maxId)
      ) {
        this.maxId =
          (this.data?.length ? Math.max(...this.data.map((x) => x.$loki)) : 0) +
          1;
      } else {
        this.maxId += 1;
      }

      const newId = this.maxId;
      newDocument.$loki = newId;

      if (!this.disableMeta) {
        ensureMetadata(newDocument);
        newDocument.meta.version = 0;
      }

      for (let i = 0; i < this.uniqueNames.length; i += 1) {
        this.getUniqueIndex(this.uniqueNames[i], true).set(document);
      }

      if (this.idIndex) {
        this.idIndex.push(newId);
      }

      if (this.isIncremental) {
        this.dirtyIds.push(newId);
      }

      // add the object
      this.data.push(newDocument);

      const addedPos = this.data.length - 1;

      // now that we can efficiently determine the data[] position of newly
      // added document, submit it for all registered DynamicViews to evaluate
      // for inclusion/exclusion
      const dynamicViewCount = this.dynamicViews.length;
      for (let i = 0; i < dynamicViewCount; i += 1) {
        this.dynamicViews[i].evaluateDocument(addedPos, true);
      }

      if (this.adaptiveBinaryIndices) {
        // for each binary index defined in collection, immediately update
        // rather than flag for lazy rebuild
        const binaryIndexKeys = Object.keys(this.binaryIndices) as (keyof T)[];

        for (let i = 0; i < binaryIndexKeys.length; i += 1) {
          const key = binaryIndexKeys[i];
          this.adaptiveBinaryIndexInsert(addedPos, key);
        }
      } else {
        this.flagBinaryIndexesDirty();
      }

      this.commit();
      this.dirty = true; // for autosave scenarios

      return this.cloneObjects ? clone(document, this.cloneMethod) : document;
    } catch (error) {
      this.rollback();
      this.consoleWrapper.error(error);
      this.dispatchEvent(new ErrorEvent(error));
      throw error; // re-throw error so user does not think it succeeded
    }
  };

  /**
   * Applies a filter function and passes all results to an update function.
   *
   * @param filterFunction - filter function whose results will execute update
   * @param updateFunction - update function to run against filtered documents
   */
  updateWhere = (
    filterFunction: FilterFunction<T>,
    updateFunction: (
      x: T & ICollectionDocument
    ) => (T & ICollectionDocument) | void
  ) => {
    const results = this.where(filterFunction);

    try {
      for (let i = 0; i < results.length; i += 1) {
        const document = updateFunction(results[i]);
        if (document) {
          this.update(document);
        }
      }
    } catch (error) {
      this.rollback();
      this.consoleWrapper.error(error);
      throw error;
    }
  };

  /**
   * Remove all documents matching supplied filter function.
   * For 'mongo-like' querying you should migrate to
   * [findAndRemove()]{@link Collection#findAndRemove}.
   *
   * @param query - query object to filter on
   */
  removeWhere = (query: IQuery<T> | FilterFunction<T>) => {
    if (typeof query === 'function') {
      const filteredData = this.data.filter(query as FilterFunction<T>);
      this.remove(filteredData);
    } else {
      this.chain().find(query).remove();
    }
  };

  removeDataOnly = () => {
    this.remove(this.data.slice());
  };

  /**
   * Internal method to remove a batch of documents from the collection.
   * @param positions - data/idIndex positions to remove
   */
  removeBatchByPositions = (positions: number[]) => {
    if (!this.idIndex) {
      throw new TypeError(
        'Collection is not ready since `idIndex` is not available now'
      );
    }
    const documentIndices: Record<number, boolean> = {};
    const uniqueCount = Object.keys(this.constraints.unique).length;
    const binaryIndexCount = Object.keys(this.binaryIndices).length;
    const adaptiveOverride =
      this.adaptiveBinaryIndices && Object.keys(this.binaryIndices).length > 0;

    try {
      this.startTransaction();

      // create hash-object for positional removal inclusion tests...
      // all keys defined in this hash-object represent $loki ids of the
      // documents to remove.
      this.ensureId();
      for (let i = 0; i < positions.length; i += 1) {
        documentIndices[this.idIndex[positions[i]]] = true;
      }

      // if we will need to notify dynamic views and/or binary indices to update
      // themselves...
      const dynamicViewCount = this.dynamicViews.length;
      if (dynamicViewCount > 0 || binaryIndexCount > 0 || uniqueCount > 0) {
        if (dynamicViewCount > 0) {
          // notify dynamic views to remove relevant documents at data positions
          for (let j = 0; j < dynamicViewCount; j += 1) {
            // notify dynamic view of remove (passing batch/array of positions)
            // @ts-ignore: Let's fix this later
            this.dynamicViews[j].removeDocument(positions);
          }
        }

        // notify binary indices to update
        if (this.adaptiveBinaryIndices && !adaptiveOverride) {
          // for each binary index defined in collection, immediately update
          // rather than flag for lazy rebuild
          const binaryIndexKeys = Object.keys(
            this.binaryIndices
          ) as (keyof T)[];
          for (let j = 0; j < binaryIndexKeys.length; j += 1) {
            const key = binaryIndexKeys[j];
            this.adaptiveBinaryIndexRemove(positions, key);
          }
        } else {
          this.flagBinaryIndexesDirty();
        }

        if (uniqueCount) {
          this.uniqueNames.forEach((key) => {
            const index = this.getUniqueIndex(key);
            if (index) {
              for (let i = 0; i < positions.length; i += 1) {
                const document = this.data[positions[i]];
                const value = lens(document, key, true);
                if (value !== null && value !== undefined) {
                  index.remove(value);
                }
              }
            }
          });
        }
      }

      // emit 'delete' events only of listeners are attached.
      // since data not removed yet, in future we can emit single delete event
      // with array...
      // for now that might be breaking change to put in potential 1.6 / 2.0
      // version
      if (!this.disableChangesApi) {
        for (let i = 0; i < positions.length; i += 1) {
          this.dispatchEvent(
            new CollectionDocumentDeleteEvent(this.data[positions[i]])
          );
        }
      }

      // remove from data[] :
      // filter collection data for items not in inclusion hash-object
      this.data = this.data.filter((obj) => {
        return !documentIndices[obj.$loki];
      });

      if (this.isIncremental) {
        for (let i = 0; i < positions.length; i += 1) {
          this.dirtyIds.push(this.idIndex[positions[i]]);
        }
      }

      // remove from idIndex[] :
      // filter idIndex for items not in inclusion hash-object
      this.idIndex = this.idIndex.filter((id) => {
        return !documentIndices[id];
      });

      if (this.adaptiveBinaryIndices && adaptiveOverride) {
        this.adaptiveBinaryIndices = false;
        this.ensureAllIndexes(true);
        this.adaptiveBinaryIndices = true;
      }

      this.commit();

      // flag collection as dirty for autosave
      this.dirty = true;
    } catch (error) {
      this.rollback();
      if (adaptiveOverride) {
        this.adaptiveBinaryIndices = true;
      }
      this.dispatchEvent(new ErrorEvent(error));
      return null;
    }
  };

  /**
   *  Internal method called by remove()
   *
   * @param batch - array of documents or $loki ids to remove
   */
  private removeBatch = (batch: ((T & ICollectionDocument) | number)[]) => {
    const positionMap: Record<number, number> = {};
    const positionIndex: number[] = [];

    // create lookup hash-object to translate $loki id to position
    for (let i = 0; i < this.data.length; i += 1) {
      positionMap[this.data[i].$loki] = i;
    }

    // iterate the batch
    for (let i = 0; i < batch.length; i += 1) {
      const removeRequest = batch[i];
      if (typeof removeRequest === 'object') {
        positionIndex.push(positionMap[removeRequest.$loki]);
      } else {
        positionIndex.push(positionMap[removeRequest]);
      }
    }

    this.removeBatchByPositions(positionIndex);
  };

  /**
   * Remove a document from the collection
   *
   * @param {object} document - document to remove from collection
   */
  remove = (
    document:
      | (T & ICollectionDocument)
      | number
      | ((T & ICollectionDocument) | number)[]
      | null
  ) => {
    if (!this.idIndex) {
      throw new TypeError(
        'Collection is not ready since `idIndex` is not available now'
      );
    }

    let internalDocument =
      typeof document === 'number' ? this.get(document) : document;

    if (typeof internalDocument !== 'object') {
      if (typeof document === 'number') {
        throw new TypeError('Document with given id is not found');
      } else {
        throw new TypeError('Parameter is invalid');
      }
    }

    if (!internalDocument) {
      throw new TypeError('Document not found');
    }

    if (Array.isArray(internalDocument)) {
      this.removeBatch(internalDocument);
      return null;
    }

    if (!hasOwn(internalDocument, '$loki')) {
      throw new Error('Object is not a document stored in the collection');
    }

    try {
      this.startTransaction();
      const documents = this.get(internalDocument.$loki, true);

      if (!documents) {
        throw new TypeError(
          'Document with given id is not found, this is a bug'
        );
      }
      const position = documents[1];

      for (let i = 0; i < this.uniqueNames.length; i += 1) {
        const key = this.uniqueNames[i];
        const value = lens(internalDocument, key, true);

        if (value !== null && value !== undefined) {
          const index = this.getUniqueIndex(key);
          if (index) {
            index.remove(value);
          }
        }
      }
      // now that we can efficiently determine the data[] position of newly
      // added document,
      // submit it for all registered DynamicViews to remove
      for (let i = 0; i < this.dynamicViews.length; i += 1) {
        this.dynamicViews[i].removeDocument(position);
      }

      if (this.adaptiveBinaryIndices) {
        // for each binary index defined in collection, immediately update
        // rather than flag for lazy rebuild
        const binaryIndexKeys = Object.keys(this.binaryIndices) as (keyof T)[];

        for (let i = 0; i < binaryIndexKeys.length; i += 1) {
          const key = binaryIndexKeys[i];
          this.adaptiveBinaryIndexRemove(position, key);
        }
      } else {
        this.flagBinaryIndexesDirty();
      }

      this.data.splice(position, 1);
      suspenseObserve(internalDocument);

      // remove id from idIndex
      this.idIndex.splice(position, 1);

      if (this.isIncremental) {
        this.dirtyIds.push(internalDocument.$loki);
      }

      this.commit();
      this.dirty = true; // for autosave scenarios
      this.dispatchEvent(new CollectionDocumentDeleteEvent(documents[0]));

      if (!this.disableFreeze) {
        internalDocument = unFreeze(internalDocument);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (internalDocument as any).$loki;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (internalDocument as any).meta;
      if (!this.disableFreeze) {
        freeze(internalDocument);
      }
      return internalDocument;
    } catch (error) {
      this.rollback();
      this.dispatchEvent(new ErrorEvent(error));
      return null;
    }
  };

  /* --------------------+
  | Finding methods     |
  +--------------------*/
  /**
   * Get by Id - faster than other methods because of the searching algorithm
   *
   * @param id - $loki id of document you want to retrieve
   * @param returnPosition - if 'true' we will return [object, position]
   * @returns Object reference if document was found, null if not, or an array
   *          if 'returnPosition' was passed.
   */
  get(
    id: number,
    returnPosition: true
  ): [T & ICollectionDocument, number] | null;
  get(id: number, returnPosition: false): (T & ICollectionDocument) | null;
  get(id: number): (T & ICollectionDocument) | null;
  get(id: number, returnPosition?: boolean) {
    if (!this.idIndex) {
      this.ensureId();
    }

    if (!this.idIndex) {
      throw new TypeError(
        '`idIndex` not exists, this is a bug, since it should be initialized by this.ensureId'
      );
    }

    let max = this.idIndex.length - 1;
    let min = 0;

    const internalId = typeof id === 'number' ? id : Number.parseInt(id, 10);

    if (Number.isNaN(internalId)) {
      throw new TypeError('Passed id is not an integer');
    }

    while (min <= max) {
      const mid = (min + max) >> 1;

      if (this.idIndex[mid] >= internalId) {
        max = mid - 1;
      } else {
        min = mid + 1;
      }
    }

    if (min < this.idIndex.length && this.idIndex[min] === internalId) {
      if (returnPosition) {
        return [this.data[min], min];
      }
      return this.data[min];
    }

    return null;
  }

  /**
   * Perform binary range lookup for the data[dataPosition][binaryIndexName]
   * property value.
   * Since multiple documents may contain the same value (which the index is
   * sorted on), we hone in on range and then linear scan range to find exact
   * index array position.
   *
   * @param dataPosition - coll.data array index/position
   * @param binaryIndexName - index to search for dataPosition in
   */
  getBinaryIndexPosition = <K extends keyof T, D extends boolean>(
    dataPosition: number,
    binaryIndexName: K,
    usingDotNotation?: D
  ) => {
    const value = lens(
      this.data[dataPosition],
      binaryIndexName,
      usingDotNotation
    );
    const index = this.binaryIndices[binaryIndexName].values;

    if (value === undefined || value === null) {
      return null;
    }

    // i think calculateRange can probably be moved to collection
    // as it doesn't seem to need resultset.  need to verify
    const range = this.calculateRange(
      '$eq',
      binaryIndexName,
      value as LensResult<T, K, D>,
      usingDotNotation
    );

    if (range[0] === 0 && range[1] === -1) {
      // didn't find range
      return null;
    }

    const min = range[0];
    const max = range[1];

    // narrow down the sub-segment of index values
    // where the indexed property value exactly matches our
    // value and then linear scan to find exact -index- position
    for (let i = min; i <= max; i += 1) {
      if (index[i] === dataPosition) return i;
    }

    return null;
  };

  /**
   * Adaptively insert a selected item to the index.
   *
   * @param dataPosition : coll.data array index/position
   * @param binaryIndexName : index to search for dataPosition in
   */
  adaptiveBinaryIndexInsert = <
    K extends ValidSimpleLensField,
    D extends boolean
  >(
    dataPosition: number,
    binaryIndexName: K,
    usingDotNotation?: D
  ) => {
    const index = this.binaryIndices[binaryIndexName].values;
    let value = lens(
      this.data[dataPosition],
      binaryIndexName,
      usingDotNotation
    );

    // If you are inserting a javascript Date value into a binary index, convert
    // to epoch time
    if (this.serializableIndices === true && value instanceof Date) {
      value = lens(this.data[dataPosition], binaryIndexName, usingDotNotation);
    }

    const indexPosition =
      index.length === 0 || value === undefined || value === null
        ? 0
        : this.calculateRangeStart(
            binaryIndexName,
            value as LensResult<T, K, D>,
            true,
            usingDotNotation
          );

    // insert new data index into our binary index at the proper sorted location
    // for relevant property calculated by `indexPosition`.
    // doing this after adjusting dataPositions so no clash with previous item
    // at that position.
    this.binaryIndices[binaryIndexName].values.splice(
      indexPosition,
      0,
      dataPosition
    );
  };

  /**
   * Adaptively update a selected item within an index.
   *
   * @param dataPosition - coll.data array index/position
   * @param binaryIndexName - index to search for dataPosition in
   */
  adaptiveBinaryIndexUpdate = (
    dataPosition: number,
    binaryIndexName: ValidSimpleLensField
  ) => {
    // linear scan needed to find old position within index unless we optimize
    // for clone scenarios later within (my) node 5.6.0, the following for()
    // loop with strict compare is -much- faster than indexOf()
    let indexPosition;
    const binaryIndex = this.binaryIndices[binaryIndexName].values;

    for (
      indexPosition = 0;
      indexPosition < binaryIndex.length;
      indexPosition += 1
    ) {
      if (binaryIndex[indexPosition] === dataPosition) break;
    }

    this.binaryIndices[binaryIndexName].values.splice(indexPosition, 1);
    this.adaptiveBinaryIndexInsert(dataPosition, binaryIndexName);
  };

  /**
   * Adaptively remove a selected item from the index.
   *
   * @param dataPosition - coll.data array index/position
   * @param binaryIndexName - index to search for dataPosition in
   */
  adaptiveBinaryIndexRemove = (
    dataPosition: number | number[],
    binaryIndexName: keyof T,
    removedFromIndexOnly?: boolean
  ) => {
    const binaryIndex = this.binaryIndices[binaryIndexName];
    const removeIndexMap: Record<number, boolean> = {};

    let internalDataPosition = Array.isArray(dataPosition)
      ? dataPosition[0]
      : dataPosition;

    if (Array.isArray(dataPosition)) {
      // when called from chained remove, and only one document in array,
      // it will be faster to use old algorithm
      const dataPositionCount = dataPosition.length;
      if (dataPositionCount === 1) {
        [internalDataPosition] = dataPosition;
      } else {
        // we were passed an array (batch) of documents so use this 'batch
        // optimized' algorithm
        for (let i = 0; i < dataPositionCount; i += 1) {
          removeIndexMap[dataPosition[i]] = true;
        }

        // remove document from index (with filter function)
        binaryIndex.values = binaryIndex.values.filter(
          (index) => !removeIndexMap[index]
        );

        // if we passed this optional flag parameter, we are calling from
        // adaptiveBinaryIndexUpdate, in which case data positions stay the same.
        if (removedFromIndexOnly === true) {
          return;
        }

        const sortedPositions = dataPosition.slice();
        sortedPositions.sort((a, b) => {
          return a - b;
        });

        // to remove holes, we need to 'shift down' the index's data array
        // positions we need to adjust array positions -1 for each index data
        // positions greater than removed positions
        for (let i = 0; i < binaryIndex.values.length; i += 1) {
          const current = binaryIndex.values[i];
          let shift = 0;
          for (
            let j = 0;
            j < dataPositionCount && current > sortedPositions[j];
            j += 1
          ) {
            shift += 1;
          }
          binaryIndex.values[i] -= shift;
        }

        // batch processed, bail out
        return;
      }

      // not a batch so continue...
    }

    const indexPosition = this.getBinaryIndexPosition(
      internalDataPosition,
      binaryIndexName
    );

    if (indexPosition === null) {
      // throw new Error('unable to determine binary index position');
      return null;
    }

    // remove document from index (with splice)
    binaryIndex.values.splice(indexPosition, 1);

    // if we passed this optional flag parameter, we are calling from
    // adaptiveBinaryIndexUpdate, in which case data positions stay the same.
    if (removedFromIndexOnly === true) {
      return;
    }

    // since index stores data array positions, if we remove a document
    // we need to adjust array positions -1 for all document positions greater
    // than removed position
    for (let i = 0; i < binaryIndex.values.length; i += 1) {
      if (binaryIndex.values[i] > internalDataPosition) {
        binaryIndex.values[i] -= 1;
      }
    }
  };

  /**
   * Internal method used for index maintenance and indexed searching.
   * Calculates the beginning of an index range for a given value.
   * For index maintenance (adaptive:true), we will return a valid index
   * position to insert to.
   * For querying (adaptive:false/undefined), we will :
   *    return lower bound/index of range of that value (if found)
   *    return next lower index position if not found (hole)
   * If index is empty it is assumed to be handled at higher level, so
   * this method assumes there is at least 1 document in index.
   *
   * @param property - name of property which has binary index
   * @param value - value to find within index
   * @param adaptive - if true, we will return insert position
   */
  calculateRangeStart = <P extends ValidSimpleLensField, D extends boolean>(
    property: ValidSimpleLensField,
    value: LensResult<T, P, D>,
    adaptive?: boolean,
    usingDotNotation?: D
  ) => {
    const { data } = this;
    const index = this.binaryIndices[property].values;
    let min = 0;
    let max = index.length - 1;
    let mid = 0;

    if (index.length === 0) {
      return -1;
    }

    // hone in on start position of value
    while (min < max) {
      mid = (min + max) >> 1;

      if (
        Comparators.lt(
          lens(data[index[mid]], property, usingDotNotation),
          value,
          false
        )
      ) {
        min = mid + 1;
      } else {
        max = mid;
      }
    }

    const lbound = min;

    // found it... return it
    if (
      Comparators.aeq(
        value,
        lens(data[index[lbound]], property, usingDotNotation)
      )
    ) {
      return lbound;
    }

    // if not in index and our value is less than the found one
    if (
      Comparators.lt(
        value,
        lens(data[index[lbound]], property, usingDotNotation),
        false
      )
    ) {
      return adaptive ? lbound : lbound - 1;
    }

    // not in index and our value is greater than the found one
    return adaptive ? lbound + 1 : lbound;
  };

  /**
   * Internal method used for indexed $between.  Given a prop (index name), and
   * a value (which may or may not yet exist) this will find the final position
   * of that upper range value.
   */
  private calculateRangeEnd = <
    K extends ValidSimpleLensField,
    D extends boolean
  >(
    property: K,
    value: LensResult<T, K, D>,
    usingDotNotation?: D
  ) => {
    const { data } = this;
    const index = this.binaryIndices[property].values;
    let min = 0;
    let max = index.length - 1;
    let mid = 0;

    if (index.length === 0) {
      return -1;
    }

    // hone in on start position of value
    while (min < max) {
      mid = (min + max) >> 1;

      if (
        Comparators.lt(
          value,
          lens(data[index[mid]], property, usingDotNotation),
          false
        )
      ) {
        max = mid;
      } else {
        min = mid + 1;
      }
    }

    const ubound = max;

    // only eq if last element in array is our val
    if (
      Comparators.aeq(
        value,
        lens(data[index[ubound]], property, usingDotNotation)
      )
    ) {
      return ubound;
    }

    // if not in index and our value is less than the found one
    if (
      Comparators.gt(
        value,
        lens(data[index[ubound]], property, usingDotNotation),
        false
      )
    ) {
      return ubound + 1;
    }

    // either hole or first non-match
    if (
      Comparators.aeq(
        value,
        lens(data[index[ubound - 1]], property, usingDotNotation)
      )
    ) {
      return ubound - 1;
    }

    // hole, so ubound if nearest gt than the val we were looking for
    return ubound;
  };

  /**
   * calculateRange() - Binary Search utility method to find range/segment of
   * values matching criteria.
   * this is used for collection.find() and first find filter of
   * resultSet/dynamicView slightly different than get() binary search in that
   * get() hones in on 1 value, but we have to hone in on many (range)
   *
   * @param operation - operation, such as $eq
   * @param property - name of property to calculate range for
   * @param value - value to use for range calculation.
   * @returns [start, end] index array positions
   */
  calculateRange = <P extends ValidSimpleLensField, D extends boolean>(
    operation: Operator,
    property: P,
    value: LensResult<T, P, D>,
    usingDotNotation?: D
  ): [number, number] => {
    const { data } = this;
    const index = this.binaryIndices[property].values;
    const min = 0;
    const max = index.length - 1;

    // when no documents are in collection, return empty range condition
    if (data.length === 0) {
      return [0, -1];
    }

    const minValue = lens(data[index[min]], property, usingDotNotation);
    const maxValue = lens(data[index[max]], property, usingDotNotation);

    let lBound: number | undefined;
    let uBound: number | undefined;
    let lValue: unknown | undefined;

    const indexSet: boolean[] = [];
    const segmentResult = [] as unknown as [number, number];
    // if value falls outside of our range return [0, -1] to designate no
    // results
    switch (operation) {
      case '$eq':
      case '$aeq':
        if (
          Comparators.lt(value, minValue, false) ||
          Comparators.gt(value, maxValue, false)
        ) {
          return [0, -1];
        }
        break;
      case '$dteq':
        if (
          Comparators.lt(value, minValue, false) ||
          Comparators.gt(value, maxValue, false)
        ) {
          return [0, -1];
        }
        break;
      case '$gt':
        // none are within range
        if (Comparators.gt(value, maxValue, true)) {
          return [0, -1];
        }
        // all are within range
        if (Comparators.gt(minValue, value, false)) {
          return [min, max];
        }
        break;
      case '$gte':
        // none are within range
        if (Comparators.gt(value, maxValue, false)) {
          return [0, -1];
        }
        // all are within range
        if (Comparators.gt(minValue, value, true)) {
          return [min, max];
        }
        break;
      case '$lt':
        // none are within range
        if (Comparators.lt(value, minValue, true)) {
          return [0, -1];
        }
        // all are within range
        if (Comparators.lt(maxValue, value, false)) {
          return [min, max];
        }
        break;
      case '$lte':
        // none are within range
        if (Comparators.lt(value, minValue, false)) {
          return [0, -1];
        }
        // all are within range
        if (Comparators.lt(maxValue, value, true)) {
          return [min, max];
        }
        break;
      case '$between':
        if (!Array.isArray(value)) {
          throw new TypeError(
            'The query condition of $between should be an array'
          );
        }
        // none are within range (low range is greater)
        if (Comparators.gt(value[0], maxValue, false)) {
          return [0, -1];
        }
        // none are within range (high range lower)
        if (Comparators.lt(value[1], minValue, false)) {
          return [0, -1];
        }

        lBound = this.calculateRangeStart(
          property,
          value[0],
          false,
          usingDotNotation
        );
        uBound = this.calculateRangeEnd(property, value[1], usingDotNotation);

        if (lBound < 0) {
          lBound += 1;
        }
        if (uBound > max) {
          uBound -= 1;
        }

        if (
          !Comparators.gt(
            lens(data[index[lBound]], property, usingDotNotation),
            value[0],
            true
          )
        ) {
          lBound += 1;
        }
        if (
          !Comparators.lt(
            lens(data[index[uBound]], property, usingDotNotation),
            value[1],
            true
          )
        ) {
          uBound -= 1;
        }

        if (uBound < lBound) return [0, -1];

        return [lBound, uBound];
      case '$in':
        if (!Array.isArray(value)) {
          throw new TypeError('The query condition of $in should be an array');
        }

        // query each value '$eq' operator and merge the segment results.
        for (let j = 0, len = value.length; j < len; j += 1) {
          const segment = this.calculateRange('$eq', property, value[j]);

          for (let k = segment[0]; k <= segment[1]; k += 1) {
            if (indexSet[k] === undefined) {
              indexSet[k] = true;
              segmentResult.push(k);
            }
          }
        }
        return segmentResult;

      default:
        throw new TypeError(`'${operation}' is an unknown operator`);
    }

    // determine lbound where needed
    switch (operation) {
      case '$eq':
      case '$aeq':
      case '$dteq':
      case '$gte':
      case '$lt':
        lBound = this.calculateRangeStart(
          property,
          value,
          false,
          usingDotNotation
        );
        lValue = lens(data[index[lBound]], property, usingDotNotation);
        break;
      default:
        break;
    }

    // determine ubound where needed
    switch (operation) {
      case '$eq':
      case '$aeq':
      case '$dteq':
      case '$lte':
      case '$gt':
        uBound = this.calculateRangeEnd(property, value, usingDotNotation);
        break;
      default:
        break;
    }

    switch (operation) {
      case '$eq':
      case '$aeq':
      case '$dteq':
        if (typeof lBound === 'undefined' || typeof uBound === 'undefined') {
          throw new Error('Boundary variable not initialized, this is a bug');
        }
        // if hole (not found)
        if (!Comparators.aeq(lValue, value)) {
          return [0, -1];
        }

        return [lBound, uBound];

      case '$gt':
        if (typeof uBound === 'undefined') {
          throw new Error('Boundary variable not initialized, this is a bug');
        }
        // if hole (not found) ub position is already greater
        if (
          !Comparators.aeq(
            lens(data[index[uBound]], property, usingDotNotation),
            value
          )
        ) {
          return [uBound, max];
        }
        // otherwise (found) so ubound is still equal, get next
        return [uBound + 1, max];

      case '$gte':
        if (typeof lBound === 'undefined') {
          throw new Error('Boundary variable not initialized, this is a bug');
        }
        // if hole (not found) lb position marks left outside of range
        if (
          !Comparators.aeq(
            lens(data[index[lBound]], property, usingDotNotation),
            value
          )
        ) {
          return [lBound + 1, max];
        }
        // otherwise (found) so lb is first position where its equal
        return [lBound, max];

      case '$lt':
        if (typeof lBound === 'undefined') {
          throw new Error('Boundary variable not initialized, this is a bug');
        }
        // if hole (not found) position already is less than
        if (
          !Comparators.aeq(
            lens(data[index[lBound]], property, usingDotNotation),
            value
          )
        ) {
          return [min, lBound];
        }
        // otherwise (found) so lb marks left inside of eq range, get previous
        return [min, lBound - 1];

      case '$lte':
        if (typeof uBound === 'undefined') {
          throw new Error('Boundary variable not initialized, this is a bug');
        }
        // if hole (not found) ub position marks right outside so get previous
        if (
          !Comparators.aeq(
            lens(data[index[uBound]], property, usingDotNotation),
            value
          )
        ) {
          return [min, uBound - 1];
        }
        // otherwise (found) so ub is last position where its still equal
        return [min, uBound];

      default:
        return [0, data.length - 1];
    }
  };

  /**
   * Retrieve doc by Unique index
   *
   * @param field - name of uniquely indexed property to use when doing lookup
   * @param value - unique value to search for
   * @returns document matching the value passed
   */
  by = <K extends keyof T>(field: K, value?: T[K]) => {
    if (value === undefined) {
      return (x: T[K]) => {
        return this.by(field, x);
      };
    }

    const result = this.getUniqueIndex(field, true).get(value);
    if (!this.cloneObjects) {
      return result;
    }
    return clone(result, this.cloneMethod);
  };

  /**
   * Find one object by index property, by property equal to value
   *
   * @param query - query object used to perform search with
   * @returns First matching document, or null if none
   * @memberof Collection
   */
  findOne = (
    query: Partial<IQuery<T>> = {}
  ): (T & ICollectionDocument) | null => {
    // Instantiate ResultSet and exec find op passing firstOnly = true param
    const result = this.chain().find(query, true).data();

    if (Array.isArray(result) && result.length === 0) {
      return null;
    }

    if (!this.cloneObjects) {
      return result[0];
    }

    return clone(result[0], this.cloneMethod);
  };

  /**
   * Chain method, used for beginning a series of chained find() and/or view()
   * operations on a collection.
   *
   * @param transform - named transform or array of transform steps
   * @param  parameters - Object containing properties representing parameters
   *         to substitute
   * @returns (this) resultset, or data array if any map or join-functions where
   *          called
   * */
  chain(): ResultSet<T>;
  chain<Transform extends TransformRequest<T> | TransformRequest<T>[]>(
    transform: TransformRequest<T> | TransformRequest<T>[],
    parameters?: Record<string, unknown>
  ): ResultSet<TransformResult<Transform>>;
  chain(
    transform?: TransformRequest<T> | TransformRequest<T>[] | undefined,
    parameters?: Record<string, unknown>
  ) {
    const resultSet = new ResultSet<T>(this);

    if (!transform) {
      return resultSet;
    }

    return resultSet.transform(transform, parameters);
  }

  /**
   * Find method, api is similar to mongodb.
   * for more complex queries use [chain()]{@link Collection#chain} or
   * [where()]{@link Collection#where}.
   * @param query - 'mongo-like' query object
   * @returns Array of matching documents
   * */
  find = (query?: IQuery<T>): (T & ICollectionDocument)[] => {
    return this.chain().find(query).data();
  };

  /**
   * Find object by un-indexed field by property equal to value,
   * simply iterates and returns the first element matching the query
   */
  findOneUnIndexed = <K extends keyof T>(property: K, value: T[K]) => {
    let i = this.data.length - 1;
    while (i > 0) {
      if (lens(this.data[i], property, true) === value) {
        return this.data[i];
      }

      i -= 1;
    }
    return null;
  };

  /* ------------------------+
  | Transaction methods     |
  +-------------------------*/

  /**
   * start the transaction
   * */
  private startTransaction = () => {
    if (this.transactional) {
      this.cachedData = clone(this.data, this.cloneMethod);
      this.cachedIndex = this.idIndex;
      this.cachedBinaryIndex = this.binaryIndices;
      this.cachedDirtyIds = this.dirtyIds;

      // propagate startTransaction to dynamic views
      for (let i = 0; i < this.dynamicViews.length; i += 1) {
        this.dynamicViews[i].startTransaction();
      }
    }
  };

  /**
   * commit the transaction
   * */
  private commit = () => {
    if (this.transactional) {
      this.cachedData = null;
      this.cachedIndex = null;
      this.cachedBinaryIndex = null;
      this.cachedDirtyIds = null;

      // propagate commit to dynamic views
      for (let i = 0; i < this.dynamicViews.length; i += 1) {
        this.dynamicViews[i].commit();
      }
    }
  };

  /**
   *  roll back the transaction
   * */
  rollback = () => {
    if (this.transactional) {
      if (this.cachedData !== null && this.cachedIndex !== null) {
        this.data = this.cachedData;
        this.idIndex = this.cachedIndex;
        this.binaryIndices =
          this.cachedBinaryIndex ??
          ({} as Record<keyof T, IBinaryIndex<number>>);
        this.dirtyIds = this.cachedDirtyIds ?? [];
      }

      // propagate rollback to dynamic views
      for (let i = 0; i < this.dynamicViews.length; i += 1) {
        this.dynamicViews[i].rollback();
      }
    }
  };

  /**
   * Query the collection by supplying a javascript filter function.
   *
   * @param filter - filter function to run against all collection docs
   * @returns all documents which pass your filter function
   * @example
   * const results = collection.where(function(document) {
   *   return document.legs === 8;
   * });
   */
  where = (filter: FilterFunction<T>): (T & ICollectionDocument)[] => {
    // This is because chain could return any types of data, but it's not the
    // case here
    return (
      this.chain()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(filter as any)
        .data() as (T & ICollectionDocument)[]
    );
  };

  /**
   * Map Reduce operation
   *
   * @param mapFunction - function to use as map function
   * @param reduceFunction - function to use as reduce function
   * @returns The result of your mapReduce operation
   */
  mapReduce = <P, U>(
    mapFunction: (x: T & ICollectionDocument) => P,
    reduceFunction: (x: P[]) => U
  ): U => {
    return reduceFunction(this.data.map(mapFunction));
  };

  /**
   * Join two collections on specified properties
   *
   * @param joinData - array of documents to 'join' to this collection
   * @param leftJoinProperty - property name in collection
   * @param rightJoinProperty - property name in joinData
   * @param mapFunction - (Optional) map function to use
   * @param dataOptions - options to data() before input to your map function
   * @returns Result of the mapping operation
   */
  eqJoin<R extends object>(
    joinData: R[] | Collection<R> | ResultSet<R>,
    leftJoinKey: keyof T | JoinKeyFunction<T>,
    rightJoinKey: keyof R | JoinKeyFunction<R>
  ): ResultSet<{ left: T; right: R }>;
  eqJoin<R extends Partial<T>>(
    joinData: R[] | Collection<R> | ResultSet<R>,
    leftJoinKey: keyof T | JoinKeyFunction<T>,
    rightJoinKey: keyof R | JoinKeyFunction<R>,
    mapFunction?: ((left: T, right: R) => T) | undefined
  ): ResultSet<T>;
  eqJoin<R extends Partial<T>, R0 extends object = T>(
    joinData: R[] | Collection<R> | ResultSet<R>,
    leftJoinKey: keyof T | JoinKeyFunction<T>,
    rightJoinKey: keyof R | JoinKeyFunction<R>,
    mapFunction: (left: T, right: R) => R0
  ): ResultSet<R0>;
  eqJoin<R extends Partial<T>>(
    joinData: R[] | Collection<R> | ResultSet<R>,
    leftJoinKey: keyof T | JoinKeyFunction<T>,
    rightJoinKey: keyof R | JoinKeyFunction<R>,
    mapFunction: Function = (left: T, right: R) => ({
      left,
      right,
    })
  ) {
    // logic in ResultSet class
    return new ResultSet(this).eqJoin(
      joinData,
      leftJoinKey,
      rightJoinKey,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapFunction as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
  }

  /* ------------------------+
  | Transaction methods     |
  +-------------------------*/

  /**
   * stages: a map of uniquely identified 'stages', which hold copies of objects
   * to be manipulated without affecting the data in the original collection
   */
  stages = {} as Record<string, Record<number, T & ICollectionDocument>>;

  /**
   * (Staging API) create a stage and/or retrieve it
   */
  getStage = (name: string) => {
    if (!this.stages[name]) {
      this.stages[name] = {};
    }
    return this.stages[name];
  };

  /**
   * a collection of objects recording the changes applied through a
   * commit stage
   */
  commitLog: ICollectionCommitLog<T>[] = [];

  /**
   * (Staging API) create a copy of an object and insert it into a stage
   */
  stage = (stageName: string, document: T & ICollectionDocument) => {
    const copy = JSON.parse(JSON.stringify(document));
    this.getStage(stageName)[document.$loki] = copy;
    return copy;
  };

  /**
   * (Staging API) re-attach all objects to the original collection,
   * so indexes and views can be rebuilt, then create a message to be inserted
   * in the commit log
   *
   * @param {string} stageName - name of stage
   * @param {string} message
   * @memberof Collection
   */
  commitStage = (stageName: string, message: string) => {
    const stage = this.getStage(stageName);
    const timestamp = Date.now();

    const stageKeys = Object.keys(stage) as unknown as (keyof typeof stage)[];

    for (let i = 0; i < stageKeys.length; i += 1) {
      const key = stageKeys[i];
      this.update(stage[key]);
      this.commitLog.push({
        timestamp,
        message,
        data: JSON.parse(JSON.stringify(stage[key])),
      });
    }
    this.stages[stageName] = {};
  };

  /* ----------------+
  | Other utils     |
  +-----------------*/
  extract = <K extends DotNotation<T>>(
    field: K
  ): LensResult<T & ICollectionDocument, K, ValidDotNotation<K>>[] => {
    const result: LensResult<
      T & ICollectionDocument,
      K,
      ValidDotNotation<K>
    >[] = [];
    for (let i = 0; i < this.data.length; i += 1) {
      const query = lens(this.data[i], field, isDotNotation(field));
      if (query) result.push(query);
    }
    return result;
  };

  max = <K extends DotNotation<T>>(field: K) => {
    return Math.max.apply(null, this.extract(field) as unknown as number[]);
  };

  min = <K extends DotNotation<T>>(field: K) => {
    return Math.min.apply(null, this.extract(field) as unknown as number[]);
  };

  maxRecord = <K extends DotNotation<T>>(field: K) => {
    const useDotNotation = isDotNotation(field);

    const result = {
      index: null as number | null,
      value: undefined as number | undefined,
    };

    let max: number | undefined;
    for (let i = 0; i < this.data.length; i += 1) {
      if (max !== undefined) {
        const queryResult = lens(this.data[i], field, useDotNotation);

        if (queryResult === undefined) {
          this.consoleWrapper.warn(
            `Query result of data ${i} is undefined, treated 0`
          );
        }

        if (max < (queryResult ?? 0)) {
          max = lens(this.data[i], field, useDotNotation) as unknown as number;
          result.index = this.data[i].$loki;
        }
      } else {
        max = lens(this.data[i], field, useDotNotation) as unknown as number;
        result.index = this.data[i].$loki;
      }
    }
    result.value = max;
    return result;
  };

  minRecord = <K extends DotNotation<T>>(field: K) => {
    const useDotNotation = isDotNotation(field);

    const result = {
      index: null as number | null,
      value: undefined as number | undefined,
    };

    let min: number | undefined;
    for (let i = 0; i < this.data.length; i += 1) {
      if (min !== undefined) {
        const queryResult = lens(this.data[i], field, useDotNotation);

        if (queryResult === undefined) {
          this.consoleWrapper.warn(
            `Query result of data ${i} is undefined, treated 0`
          );
        }

        if (min > (queryResult ?? 0)) {
          min = lens(this.data[i], field, useDotNotation) as unknown as number;
          result.index = this.data[i].$loki;
        }
      } else {
        min = lens(this.data[i], field, useDotNotation) as unknown as number;
        result.index = this.data[i].$loki;
      }
    }
    result.value = min;
    return result;
  };

  extractNumerical = <K extends DotNotation<T>>(field: K) => {
    return (this.extract(field) as string[]).map(parseBase10).filter((n) => {
      return !Number.isNaN(n);
    });
  };

  /**
   * Calculates the average numerical value of a property
   *
   * @param field - name of property in docs to average
   * @returns average of property in all docs in the collection
   */
  mean = <K extends DotNotation<T>>(field: K) => {
    return mean(this.extractNumerical(field));
  };

  standardDeviation = <K extends DotNotation<T>>(field: K) => {
    return standardDeviation(this.extractNumerical(field));
  };

  sd = this.standardDeviation;

  mode = <K extends DotNotation<T>>(field: K) => {
    const resultMap = new Map<unknown, number>();
    const data = this.extract(field);

    for (let i = 0; i < data.length; i += 1) {
      const key = String(data[i]);

      if (resultMap.has(key)) {
        resultMap.set(key, resultMap.get(key)! + 1);
      } else {
        resultMap.set(key, 1);
      }
    }
    let max: number | undefined;
    let property: number | undefined;
    let mode: number | undefined;

    resultMap.forEach((value) => {
      if (max) {
        if (max < value) {
          mode = property;
        }
      } else {
        mode = property;
        max = value;
      }
    });

    return mode;
  };

  median = <K extends DotNotation<T>>(field: K) => {
    const values = this.extractNumerical(field);
    values.sort(sub);

    const half = Math.floor(values.length / 2);

    if (values.length % 2) {
      return values[half];
    }
    return (values[half - 1] + values[half]) / 2.0;
  };
}
