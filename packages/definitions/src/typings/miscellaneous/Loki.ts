export interface ILokiObject {
  $loki: number;
  meta: {
    revision: number;
    created: number;
    version: number;
    updated: number;
  };
}

export interface Meta {
  revision: number;
  created: unknown;
  version: number;
  updated: unknown;
}

export interface Options {
  persistent: boolean;
  sortPriority: string;
  minRebuildInterval: number;
}

export interface ResultSet {
  collection?: unknown;
  filteredrows: unknown[];
  filterInitialized: boolean;
}

export interface Type2 {
  $eq: string;
}

export interface Val {
  type: Type2;
}

export interface FilterPipeline {
  type: string;
  val: Val;
}

export interface Events {
  rebuild: unknown[];
  filter: unknown[];
  sort: unknown[];
}

export interface DynamicView {
  collection?: unknown;
  name: string;
  rebuildPending: boolean;
  options: Options;
  resultset: ResultSet;
  resultdata: unknown[];
  resultsdirty: boolean;
  cachedresultset?: unknown;
  filterPipeline: FilterPipeline[];
  sortFunction?: unknown;
  sortCriteria?: unknown;
  sortCriteriaSimple?: unknown;
  sortDirty: boolean;
  events: Events;
}

export interface Events2 {
  insert: unknown[];
  update: unknown[];
  'pre-insert': unknown[];
  'pre-update': unknown[];
  close: unknown[];
  flushbuffer: unknown[];
  error: unknown[];
  delete: unknown[];
  warning: unknown[];
}

export interface Collection<T> {
  name: string;
  data: (T & ILokiObject)[];
  idIndex: number[];
  binaryIndices: unknown;
  constraints?: unknown;
  uniqueNames: unknown[];
  transforms: unknown;
  objType: string;
  dirty: boolean;
  cachedIndex?: unknown;
  cachedBinaryIndex?: unknown;
  cachedData?: unknown;
  adaptiveBinaryIndices: boolean;
  transactional: boolean;
  cloneObjects: boolean;
  cloneMethod: string;
  asyncListeners: boolean;
  disableMeta: boolean;
  disableChangesApi: boolean;
  disableDeltaChangesApi: boolean;
  autoupdate: boolean;
  serializableIndices: boolean;
  disableFreeze: boolean;
  ttl?: unknown;
  maxId: number;
  DynamicViews: DynamicView[];
  events: Events2;
  changes: unknown[];
  dirtyIds: unknown[];
}

export interface Options2 {
  autoload: boolean;
  autosave: boolean;
  autosaveInterval: number;
  serializationMethod: string;
  destructureDelimiter: string;
  recursiveWait: boolean;
  recursiveWaitLimit: boolean;
  recursiveWaitLimitDuration: number;
  started: number;
}

export interface Events3 {
  init: unknown[];
  loaded: unknown[];
  flushChanges: unknown[];
  close: unknown[];
  changes: unknown[];
  warning: unknown[];
}

export interface LokiDbFile<T> {
  filename: string;
  collections: Collection<T>[];
  databaseVersion: number;
  engineVersion: number;
  autosave: boolean;
  autosaveInterval: number;
  autosaveHandle?: unknown;
  throttledSaves: boolean;
  options: Options2;
  persistenceMethod: string;
  persistenceAdapter?: unknown;
  verbose: boolean;
  events: Events3;
  ENV: string;
}
