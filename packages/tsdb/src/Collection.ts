export enum CollectionCloneMethod {
  ParseStringify = 'parse-stringify',
  JQueryExtendDeep = 'jquery-extend-deep',
  Shallow = 'shallow',
  ShallowAssign = 'shallow-assign',
}

/**
 * Options for initialize a collection.
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
 * @field cloneMethod - 'parse-stringify', 'jquery-extend-deep', 'shallow', 'shallow-assign'
 * @field ttl - age of document (in ms.) before document is considered aged/stale.
 * @field ttlInterval - time interval for clearing out 'aged' documents; not set by default.
 */
export interface ICollectionOptions {
  unique: string[];
  exact: string[];
  indices: number[];
  asyncListeners: boolean;
  disableMeta: boolean;
  disableChangesApi: boolean;
  disableDeltaChangesApi: boolean;
  autoupdate: boolean;
  clone: boolean;
  cloneMethod: CollectionCloneMethod;
  ttl?: number,
  ttlInterval?: number,
  disableFreeze?: boolean;
}

export const DEFAULT_COLLECTION_OPTION = {
  unique: [],
  exact: [],
  indices: [],
  asyncListeners: false,
  disableMeta: false,
  disableChangesApi: true,
  disableDeltaChangesApi: true,
  autoupdate: false,
  clone: false,
};

export interface ICollectionSummary {
  name: string;
  type: string;
  count: number;
}
