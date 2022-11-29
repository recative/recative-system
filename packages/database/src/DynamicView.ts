import EventTarget from '@ungap/event-target';

import type {
  Collection,
  FilterFunction,
  ICollectionDocument,
} from './Collection';
import {
  DynamicViewSortEvent,
  DynamicViewFilterEvent,
  DynamicViewRebuildEvent,
} from './Events';
import { delay } from './utils/delay';
import { CloneMethod } from './utils/clone';
import { deepFreeze, freeze } from './utils/freeze';
import type { IQuery } from './typings';
import type { TransformRequest, ResultSet, TransformResult } from './ResultSet';

/**
 * options to configure dynamic view with
 * @param persistent - indicates if view is to main internal results array in
 *        'resultdata'
 * @param sortPriority - 'passive' (sorts performed on call to data) or
 *        'active' (after updates)
 * @param minRebuildInterval - minimum rebuild interval (need clarification to
 *        docs here)
 */
export enum SortPriority {
  /**
   * will defer the sort phase until they call data(). (most efficient overall)
   */
  Passive = 'passive',
  /**
   * 'active' will sort async whenever next idle. (prioritizes read speeds)
   */
  Active = 'active',
}

export interface IDynamicViewOptions {
  persistent: boolean;
  sortPriority: SortPriority;
  minRebuildInterval: number;
}

export const DEFAULT_DYNAMIC_VIEW_OPTIONS = {
  persistent: false,
  sortPriority: SortPriority.Passive,
  minRebuildInterval: 1,
};

export interface IRematerializeOptions {
  removeWhereFilters: boolean;
}

export enum FilterType {
  Where = 'where',
  Find = 'find',
}

export interface IFilter<T> {
  type: FilterType;
  val: IQuery<T>;
  uid?: string | number;
}

/**
 * configure removeFilter behavior
 * @param queueSortPhase - if true we will async rebuild view (maybe set default
 *        to true in future?)
 */
export interface IRemoveFiltersOptions {
  queueSortPhase: boolean;
}

export type CompareFunction<T> = (a: T, B: T) => 0 | 1 | -1;

/**
 * boolean for sort descending or options object
 * @param desc - whether we should sort descending.
 * @param disableIndexIntersect - whether we should explicity not use array
 *        intersection.
 * @param forceIndexIntersect - force array intersection (if binary index
 *        exists).
 * @param useJavascriptSorting - whether results are sorted via basic javascript
 *        sort.
 */
export interface IApplySimpleSortOptions {
  desc: boolean;
  disableIndexIntersect: boolean;
  forceIndexIntersect: boolean;
  useJavaScriptSorting: boolean;
}

export interface ISortCriteriaSimple<T> {
  property: keyof T;
  options?: Partial<IApplySimpleSortOptions>;
}

export class CollectionNotReadyError extends Error {
  message = 'CollectionNotReady';

  constructor(actionDescription: string) {
    super(`Collection is not ready, unable to ${actionDescription}`);
  }
}

export type SortCriteria<T> = [keyof T, boolean];

export class ResultSetNotReadyError extends Error {
  message = 'ResultSetNotReady';

  constructor(actionDescription: string) {
    super(`ResultSet is not ready, unable to ${actionDescription}`);
  }
}

/**
 * optional parameters to pass to resultset.data() if non-persistent
 * @param forceClones - Allows forcing the return of cloned objects even when
 *        the collection is not configured for clone object.
 * @param forceCloneMethod - Allows overriding the default or collection
 *        specified cloning method.
 * @param removeMeta - Will force clones and strip $loki and meta properties
 *        from documents
 */
export interface IDynamicViewDataOptions {
  forceClones: boolean;
  forceCloneMethod: CloneMethod;
  removeMeta: boolean;
}

export interface IPerformanceSortPhaseOptions {
  suppressRebuildEvent: boolean;
}

/**
 * DynamicView class is a versatile 'live' view class which can have filters and
 * sorts applied.
 * Collection.addDynamicView(name) instantiates this DynamicView object and
 * notifies it whenever documents are add/updated/removed so it can remain
 * up-to-date. (chainable)
 *
 * @example
 * const view = collection.addDynamicView('test');  // default is non-persistent
 * view.applyFind({ 'doors' : 4 });
 * view.applyWhere(function(obj) { return obj.name === 'Toyota'; });
 * const results = view.data();
 *
 * @constructor DynamicView
 * @implements LokiEventEmitter
 * @param collection - A reference to the collection to work against
 * @param name - The name of this dynamic view
 * @param options - (Optional) Pass in object with 'persistent' and/or
 *        'sortPriority' options.
 * @see {@link Collection#addDynamicView} to construct instances of DynamicView
 */
export class DynamicView<T extends object> extends EventTarget {
  options: IDynamicViewOptions;

  rebuildPending = false;

  resultSet: ResultSet<T> | null;

  resultData: (T & ICollectionDocument)[] = [];

  resultsdirty = false;

  cachedResultSet: ResultSet<T> | null = null;

  // keep ordered filter pipeline
  filterPipeline: IFilter<unknown>[] = [];

  // sorting member variables
  // we only support one active search, applied using applySort() or
  // applySimpleSort()
  sortFunction: CompareFunction<T> | null = null;

  sortCriteria: SortCriteria<T> | null = null;

  sortCriteriaSimple: ISortCriteriaSimple<T> | null = null;

  sortDirty = false;

  constructor(
    public collection: Collection<T> | null,
    public name: string,
    options?: Partial<IDynamicViewOptions>
  ) {
    super();

    this.options = {
      ...DEFAULT_DYNAMIC_VIEW_OPTIONS,
      ...options,
    };

    // @ts-ignore: Let's refactor it later
    this.resultSet = new Resultset(collection);

    if (!this.collection?.disableFreeze) {
      Object.freeze(this.filterPipeline);
    }

    this.branchResultset = this.branchResultset.bind(this);
  }

  /**
   * getSort() - used to get the current sort
   *
   * @returns function (sortFunction) or array (sortCriteria) or object
   *          (sortCriteriaSimple)
   */
  getSort = () => {
    return this.sortFunction || this.sortCriteria || this.sortCriteriaSimple;
  };

  /**
   * Internally used immediately after deserialization (loading)
   * This will clear out and reapply filterPipeline ops, recreating the view.
   * Since where filters do not persist correctly, this method allows
   * restoring the view to state where user can re-apply those where filters.
   *
   * @param options - (Optional) allows specification of 'removeWhereFilters'
   * @returns This dynamic view for further chained ops.
   */
  rematerialize = (options?: Partial<IRematerializeOptions>) => {
    this.resultData = [];
    this.resultsdirty = true;

    // @ts-ignore: Let's refactor this later
    this.resultSet = new Resultset(this.collection);

    if (this.sortFunction || this.sortCriteria || this.sortCriteriaSimple) {
      this.sortDirty = true;
    }

    const wasFrozen = Object.isFrozen(this.filterPipeline);
    if (options?.removeWhereFilters) {
      // for each view see if it had any where filters applied... since they
      // don't serialize those functions lets remove those invalid filters
      if (wasFrozen) {
        this.filterPipeline = this.filterPipeline.slice();
      }
      let index = this.filterPipeline.length;
      const { filterPipeline } = this;
      while (index > 0) {
        index -= 1;
        const filterPipelineLength = this.filterPipeline.length;
        if (this.filterPipeline[index].type === 'where') {
          if (index !== this.filterPipeline.length - 1) {
            filterPipeline[index] = filterPipeline[filterPipelineLength - 1];
          }
          this.filterPipeline.length -= 1;
        }
      }
    }

    // back up old filter pipeline, clear filter pipeline, and reapply pipeline
    // ops
    const oldPipeline = this.filterPipeline;
    this.filterPipeline = [];

    // now re-apply 'find' filterPipeline ops
    for (let i = 0; i < oldPipeline.length; i += 1) {
      this.applyFind(oldPipeline[i].val, oldPipeline[i].uid);
    }
    if (wasFrozen) {
      Object.freeze(this.filterPipeline);
    }

    // during creation of unit tests, i will remove this forced refresh and
    // leave lazy
    this.data();

    // emit rebuild event in case user wants to be notified
    this.dispatchEvent(new DynamicViewRebuildEvent(this));

    return this;
  };

  /**
   * Makes a copy of the internal resultset for branched queries.
   * Unlike this dynamic view, the branched resultset will not be 'live'
   * updated, so your branched query should be immediately resolved and not held
   * for future evaluation.
   *
   * @param transform - Optional name of collection transform, or an array of
   *        transform steps
   * @param parameters - optional parameters (if optional transform requires
   *        them)
   * @returns A copy of the internal resultset for branched queries.
   * @example
   * const db = new Database('test');
   * const collection = db.addCollection('myDocument');
   * const dynamicView = collection.addDynamicView('myView');
   * const tx = [
   *   {
   *     type: 'offset',
   *     value: '[%lktxp]pageStart'
   *   },
   *   {
   *     type: 'limit',
   *     value: '[%lktxp]pageSize'
   *   }
   * ];
   * collection.addTransform('viewPaging', tx);
   *
   * // add some records
   *
   * const results = dynamicView.branchResultset(
   *   'viewPaging',
   *   { pageStart: 10, pageSize: 10 }
   * ).data();
   */

  branchResultset(): ResultSet<T>;
  branchResultset<
    Transform extends TransformRequest<T> | TransformRequest<T>[]
  >(
    transform: TransformRequest<T> | TransformRequest<T>[],
    parameters?: Record<string, unknown>
  ): ResultSet<TransformResult<Transform>>;
  branchResultset(
    transform?: TransformRequest<T> | TransformRequest<T>[] | undefined,
    parameters?: Record<string, unknown>
  ) {
    if (!this.resultSet) {
      throw new ResultSetNotReadyError('branch the result set');
    }

    const resultSet = this.resultSet.branch();

    if (!transform) {
      return resultSet;
    }

    return resultSet.transform(transform, parameters);
  }

  /**
   * toJSON() - Override of toJSON to avoid circular references
   *
   */
  toJSON = () => {
    const copy = new DynamicView(this.collection, this.name, this.options);
    copy.resultSet = this.resultSet;
    copy.resultData = []; // let's not save data (copy) to minimize size
    copy.resultsdirty = true;
    copy.filterPipeline = this.filterPipeline;
    copy.sortFunction = this.sortFunction;
    copy.sortCriteria = this.sortCriteria;
    copy.sortCriteriaSimple = this.sortCriteriaSimple || null;
    copy.sortDirty = this.sortDirty;

    // avoid circular reference, reapply in db.loadJSON()
    copy.collection = null;

    return copy;
  };

  /**
   * removeFilters() - Used to clear pipeline and reset dynamic view to initial
   * state.
   * Existing options should be retained.
   * @param options - configure removeFilter behavior
   */
  removeFilters = (options?: Partial<IRemoveFiltersOptions>) => {
    if (!this.resultSet) {
      throw new ResultSetNotReadyError('remove filters');
    }

    this.rebuildPending = false;
    this.resultSet.reset();
    this.resultData = [];
    this.resultsdirty = true;

    this.cachedResultSet = null;

    const wasFrozen = Object.isFrozen(this.filterPipeline);
    const filterChanged = this.filterPipeline.length > 0;
    // keep ordered filter pipeline
    this.filterPipeline = [];
    if (wasFrozen) {
      Object.freeze(this.filterPipeline);
    }

    // sorting member variables
    // we only support one active search, applied using applySort() or applySimpleSort()
    this.sortFunction = null;
    this.sortCriteria = null;
    this.sortCriteriaSimple = null;
    this.sortDirty = false;

    if (options?.queueSortPhase) {
      this.queueSortPhase();
    }

    if (filterChanged) {
      this.dispatchEvent(new DynamicViewFilterEvent());
    }
  };

  /**
   * applySort() - Used to apply a sort to the dynamic view
   *
   * @param compareFn - a javascript compare function used for sorting
   * @returns this DynamicView object, for further chain ops.
   * @example
   * dynamicView.applySort((a, b) => {
   *   if (a.name === b.name) return 0;
   *   if (a.name > b.name) return 1;
   *   if (a.name < b.name) return -1;
   * });
   */
  applySort = (compareFn: CompareFunction<T>) => {
    this.sortFunction = compareFn;
    this.sortCriteria = null;
    this.sortCriteriaSimple = null;

    this.queueSortPhase();
    this.dispatchEvent(new DynamicViewSortEvent());

    return this;
  };

  /**
   * applySimpleSort() - Used to specify a property used for view translation.
   *
   * @param property - Name of property by which to sort.
   * @param options - boolean for sort descending or options object
   * @example
   * dynamicView.applySimpleSort("name");
   */
  applySimpleSort = (
    property: keyof T,
    options?: Partial<IApplySimpleSortOptions>
  ) => {
    if (!this.collection) {
      throw new CollectionNotReadyError('apply the sort');
    }

    this.sortCriteriaSimple = { property, options };
    if (!this.collection.disableFreeze) {
      deepFreeze(this.sortCriteriaSimple);
    }
    this.sortCriteria = null;
    this.sortFunction = null;

    this.queueSortPhase();
    this.dispatchEvent(new DynamicViewSortEvent());

    return this;
  };

  /**
   * Allows sorting a resultset based on multiple columns.
   *
   * @param criteria - array of property names or subarray of
   *        [propertyName, isDesc] used evaluate sort order
   * @returns Reference to this DynamicView, sorted, for future chain
   *          operations.
   * @example
   * // to sort by age and then name (both ascending)
   * dynamicView.applySortCriteria(['age', 'name']);
   * // to sort by age (ascending) and then by name (descending)
   * dynamicView.applySortCriteria(['age', ['name', true]);
   * // to sort by age (descending) and then by name (descending)
   * dynamicView.applySortCriteria(['age', true], ['name', true]);
   */
  applySortCriteria = (criteria: SortCriteria<T>) => {
    if (!this.collection) {
      throw new CollectionNotReadyError('apply the sort');
    }

    this.sortCriteria = criteria;
    if (!this.collection.disableFreeze) {
      deepFreeze(this.sortCriteria);
    }
    this.sortCriteriaSimple = null;
    this.sortFunction = null;

    this.queueSortPhase();
    this.dispatchEvent(new DynamicViewSortEvent());

    return this;
  };

  /**
   * marks the beginning of a transaction.
   */
  startTransaction = () => {
    if (!this.resultSet) {
      throw new ResultSetNotReadyError('start transaction');
    }

    this.cachedResultSet = this.resultSet.copy();

    return this;
  };

  /**
   * commits a transaction.
   */
  commit = () => {
    this.cachedResultSet = null;

    return this;
  };

  /**
   * rollback() - rolls back a transaction.
   *
   * @returns this DynamicView object, for further chain ops.
   */
  rollback = () => {
    this.resultSet = this.cachedResultSet;

    if (this.options.persistent) {
      if (!this.resultSet) {
        throw new ResultSetNotReadyError('rollback');
      }

      // for now just rebuild the persistent dynamic view data in this worst
      // case scenario (a persistent view utilizing transactions which get
      // rolled back), we already know the filter so not too bad.
      this.resultData = this.resultSet.data();

      this.dispatchEvent(new DynamicViewRebuildEvent(this));
    }

    return this;
  };

  /**
   * Find the index of a filter in the pipeline, by that filter's ID.
   *
   * @param uid - The unique ID of the filter.
   * @returns index of the referenced filter in the pipeline; -1 if not found.
   */
  private indexOfFilterWithId = (uid?: string | number) => {
    if (typeof uid === 'string' || typeof uid === 'number') {
      for (let idx = 0, len = this.filterPipeline.length; idx < len; idx += 1) {
        if (uid === this.filterPipeline[idx].uid) {
          return idx;
        }
      }
    }
    return -1;
  };

  /**
   * Add the filter object to the end of view's filter pipeline and apply the
   * filter to the resultset.
   *
   * @param filter - The filter object. Refer to applyFilter() for extra
   *        details.
   */
  private addFilter = <P>(filter: IFilter<P>) => {
    if (!this.collection) {
      throw new CollectionNotReadyError('add filter');
    }

    if (!this.resultSet) {
      throw new CollectionNotReadyError('add filter');
    }

    const wasFrozen = Object.isFrozen(this.filterPipeline);
    if (wasFrozen) {
      this.filterPipeline = this.filterPipeline.slice();
    }

    if (!this.collection.disableFreeze) {
      deepFreeze(filter);
    }

    this.filterPipeline.push(filter);

    if (wasFrozen) {
      Object.freeze(this.filterPipeline);
    }

    const filterFunction = this.resultSet[filter.type];
    if (typeof filterFunction !== 'function') {
      throw new TypeError('Invalid filter function');
    }

    (this.resultSet[filter.type] as Function)(filter.val);
  };

  /**
   * Reapply all the filters in the current pipeline.
   *
   * @returns this DynamicView object, for further chain ops.
   */
  reapplyFilters = () => {
    if (!this.resultSet) {
      throw new CollectionNotReadyError('add filter');
    }

    this.resultSet.reset();

    this.cachedResultSet = null;
    if (this.options.persistent) {
      this.resultData = [];
      this.resultsdirty = true;
    }

    const filters = this.filterPipeline;
    const wasFrozen = Object.isFrozen(filters);
    this.filterPipeline = [];

    for (let idx = 0, len = filters.length; idx < len; idx += 1) {
      this.addFilter(filters[idx]);
    }

    if (wasFrozen) {
      Object.freeze(this.filterPipeline);
    }

    if (this.sortFunction || this.sortCriteria || this.sortCriteriaSimple) {
      this.queueSortPhase();
    } else {
      this.queueRebuildEvent();
    }

    this.dispatchEvent(new DynamicViewFilterEvent());
    return this;
  };

  /**
   * Adds or updates a filter in the DynamicView filter pipeline
   *
   * @param filter - A filter object to add to the pipeline.
   * @returns this DynamicView object, for further chain ops.
   */
  applyFilter = <P>(filter: IFilter<P>) => {
    const idx = this.indexOfFilterWithId(filter.uid);
    if (idx >= 0) {
      const wasFrozen = Object.isFrozen(this.filterPipeline);
      if (wasFrozen) {
        this.filterPipeline = this.filterPipeline.slice();
      }
      this.filterPipeline[idx] = filter;
      if (wasFrozen) {
        freeze(filter);
        Object.freeze(this.filterPipeline);
      }
      return this.reapplyFilters();
    }

    this.cachedResultSet = null;
    if (this.options.persistent) {
      this.resultData = [];
      this.resultsdirty = true;
    }

    this.addFilter(filter);

    if (this.sortFunction || this.sortCriteria || this.sortCriteriaSimple) {
      this.queueSortPhase();
    } else {
      this.queueRebuildEvent();
    }

    this.dispatchEvent(new DynamicViewFilterEvent());
    return this;
  };

  /**
   * Adds or updates a mongo-style query option in the DynamicView filter
   * pipeline
   *
   * @param query - A mongo-style query object to apply to pipeline.
   * @param uid - Optional: The unique ID of this filter, to reference it in the
   *        future.
   * @returns this DynamicView object, for further chain ops.
   */
  applyFind = (query: IQuery<T>, uid?: string | number) => {
    this.applyFilter({
      type: FilterType.Find,
      val: query,
      uid,
    });
    return this;
  };

  /**
   * Adds or updates a javascript filter function in theDynamicView filter
   * pipeline
   *
   * @param filterFn - A javascript filter function to apply to pipeline
   * @param uid - Optional: The unique ID of this filter, to reference it in the
   *        future.
   * @returns this DynamicView object, for further chain ops.
   */
  applyWhere = (filterFn: FilterFunction<T>, uid?: string | number) => {
    this.applyFilter({
      type: FilterType.Where,
      val: filterFn,
      uid,
    });
    return this;
  };

  /**
   * Remove the specified filter from the DynamicView filter pipeline
   *
   * @param uid - The unique ID of the filter to be removed.
   * @returns this DynamicView object, for further chain ops.
   */
  removeFilter = (uid: string | number) => {
    const idx = this.indexOfFilterWithId(uid);
    if (idx < 0) {
      throw new TypeError(
        `Dynamic view does not contain a filter with ID: ${uid}`
      );
    }
    const wasFrozen = Object.isFrozen(this.filterPipeline);
    if (wasFrozen) {
      this.filterPipeline = this.filterPipeline.slice();
    }
    this.filterPipeline.splice(idx, 1);
    if (wasFrozen) {
      Object.freeze(this.filterPipeline);
    }
    this.reapplyFilters();
    return this;
  };

  /**
   * returns the number of documents representing the current DynamicView
   * contents.
   *
   * @returns The number of documents representing the current DynamicView
   *          contents.
   * @memberof DynamicView
   */
  count = () => {
    if (!this.resultSet) {
      throw new CollectionNotReadyError('count');
    }

    // in order to be accurate we will pay the minimum cost (and not alter
    // dynamic view state management) recurring resultset data resolutions
    // should know internally its already up to date. for persistent data this
    // will not update resultdata nor fire rebuild event.
    if (this.resultsdirty) {
      this.resultData = this.resultSet.data();
    }

    return this.resultSet.count();
  };

  /**
   * resolves and pending filtering and sorting, then returns document array as
   * result.
   *
   * @param options - optional parameters to pass to resultset.data() if
   *        non-persistent.
   * @returns An array of documents representing the current DynamicView
   *          contents.
   */
  data = (options?: IDynamicViewDataOptions) => {
    if (!this.resultSet) {
      throw new CollectionNotReadyError('extract data');
    }

    // using final sort phase as 'catch all' for a few use cases which require
    // full rebuild
    if (this.sortDirty || this.resultsdirty) {
      this.performSortPhase({
        suppressRebuildEvent: true,
      });
    }
    return this.options.persistent
      ? this.resultData
      : this.resultSet.data(options);
  };

  /**
   * When the view is not sorted we may still wish to be notified of rebuild
   * events.
   * This event will throttle and queue a single rebuild event when batches of
   * updates affect the view.
   */
  queueRebuildEvent = () => {
    if (this.rebuildPending) {
      return;
    }
    this.rebuildPending = true;

    return delay(() => {
      if (this.rebuildPending) {
        this.rebuildPending = false;
        this.dispatchEvent(new DynamicViewRebuildEvent(this));
      }
    }, this.options.minRebuildInterval);
  };

  /**
   * If the view is sorted we will throttle sorting to either:
   *    (1) passive - when the user calls data(), or
   *    (2) active - once they stop updating and yield js thread control
   */
  queueSortPhase = () => {
    // already queued? exit without queuing again
    if (this.sortDirty) {
      return;
    }
    this.sortDirty = true;

    if (this.options.sortPriority === SortPriority.Active) {
      // active sorting... once they are done and yield js thread, run async
      // performSortPhase()
      return delay(() => {
        this.performSortPhase();
      }, this.options.minRebuildInterval);
    }

    // must be passive sorting... since not calling performSortPhase (until
    // data call), lets use queueRebuildEvent to
    // potentially notify user that data has changed.
    this.queueRebuildEvent();
  };

  /**
   * invoked synchronously or asynchronously to perform final sort phase
   * (if needed)
   */
  performSortPhase = (options?: IPerformanceSortPhaseOptions) => {
    if (!this.resultSet) {
      throw new CollectionNotReadyError('perform sort phase');
    }
    // async call to this may have been pre-emptied by synchronous call to data
    // before async could fire
    if (!this.sortDirty && !this.resultsdirty) {
      return;
    }

    if (this.sortDirty) {
      if (this.sortFunction) {
        this.resultSet.sort(this.sortFunction);
      } else if (this.sortCriteria) {
        // @ts-ignore Let's refactor this later
        this.resultSet.compoundSort(this.sortCriteria);
      } else if (this.sortCriteriaSimple) {
        this.resultSet.simpleSort(
          // @ts-ignore Let's refactor this later
          this.sortCriteriaSimple.property,
          this.sortCriteriaSimple.options
        );
      }

      this.sortDirty = false;
    }

    if (this.options.persistent) {
      // persistent view, rebuild local resultdata array
      this.resultData = this.resultSet.data();
      this.resultsdirty = false;
    }

    if (!options?.suppressRebuildEvent) {
      this.dispatchEvent(new DynamicViewRebuildEvent(this));
    }
  };

  /**
   * internal method for (re)evaluating document inclusion.
   * Called by: collection.insert() and collection.update().
   *
   * @param index - index of document to (re)run through filter pipeline.
   * @param isNew - true if the document was just added to the collection.
   */
  evaluateDocument = (index: number, isNew: boolean) => {
    if (!this.collection) {
      throw new CollectionNotReadyError('evaluate the document');
    }

    if (!this.resultSet) {
      throw new CollectionNotReadyError('evaluate the document');
    }

    // if no filter applied yet, the result 'set' should remain 'everything'
    if (!this.resultSet.filterInitialized) {
      if (this.options.persistent) {
        this.resultData = this.resultSet.data();
      }
      // need to re-sort to sort new document
      if (this.sortFunction || this.sortCriteria || this.sortCriteriaSimple) {
        this.queueSortPhase();
      } else {
        this.queueRebuildEvent();
      }
      return;
    }

    const { filteredRows } = this.resultSet;
    const oldPosition = isNew ? -1 : filteredRows.indexOf(+index);
    const oldLength = filteredRows.length;

    // creating a 1-element resultset to run filter chain ops on to see if that
    // document passes filters;
    // mostly efficient algorithm, slight stack overhead price (this function is
    // called on inserts and updates)
    // @ts-ignore Let's refactor this later
    const evalResultset = new Resultset(this.collection);
    evalResultset.filteredrows = [index];
    evalResultset.filterInitialized = true;

    for (let i = 0, len = this.filterPipeline.length; i < len; i += 1) {
      const filter = this.filterPipeline[i];
      const filterFunction = evalResultset[filter.type];

      if (typeof filterFunction !== 'function') {
        throw new TypeError('Invalid filter function');
      }

      (filterFunction as Function)(filter.val);
    }

    // not a true position, but -1 if not pass our filter(s), 0 if passed
    // filter(s)
    const newPosition = evalResultset.filteredrows.length === 0 ? -1 : 0;

    // wasn't in old, shouldn't be now... do nothing
    if (oldPosition === -1 && newPosition === -1) return;

    // wasn't in resultset, should be now... add
    if (oldPosition === -1 && newPosition !== -1) {
      filteredRows.push(index);

      if (this.options.persistent) {
        this.resultData.push(this.collection.data[index]);
      }

      // need to re-sort to sort new document
      if (this.sortFunction || this.sortCriteria || this.sortCriteriaSimple) {
        this.queueSortPhase();
      } else {
        this.queueRebuildEvent();
      }

      return;
    }

    // was in resultset, shouldn't be now... delete
    if (oldPosition !== -1 && newPosition === -1) {
      if (oldPosition < oldLength - 1) {
        filteredRows.splice(oldPosition, 1);

        if (this.options.persistent) {
          this.resultData.splice(oldPosition, 1);
        }
      } else {
        filteredRows.length = oldLength - 1;

        if (this.options.persistent) {
          this.resultData.length = oldLength - 1;
        }
      }

      // in case changes to data altered a sort column
      if (this.sortFunction || this.sortCriteria || this.sortCriteriaSimple) {
        this.queueSortPhase();
      } else {
        this.queueRebuildEvent();
      }

      return;
    }

    // was in resultset, should still be now... (update persistent only?)
    if (oldPosition !== -1 && newPosition !== -1) {
      if (this.options.persistent) {
        // in case document changed, replace persistent view data with the
        // latest collection.data document
        this.resultData[oldPosition] = this.collection.data[index];
      }

      // in case changes to data altered a sort column
      if (this.sortFunction || this.sortCriteria || this.sortCriteriaSimple) {
        this.queueSortPhase();
      } else {
        this.queueRebuildEvent();
      }
    }
  };

  /**
   * removeDocument() - internal function called on collection.delete()
   * @param index - index of document to (re)run-through filter pipeline.
   */
  removeDocument = (index: number | number[]) => {
    if (!this.resultSet) {
      throw new CollectionNotReadyError('remove the document');
    }

    const filteredRowsIndexMap = new Set<number>();
    const intersectionIndexMap = new Set<number>();

    // if no filter applied yet, the result 'set' should remain 'everything'
    if (!this.resultSet.filterInitialized) {
      if (this.options.persistent) {
        this.resultData = this.resultSet.data();
      }
      // in case changes to data altered a sort column
      if (this.sortFunction || this.sortCriteria || this.sortCriteriaSimple) {
        this.queueSortPhase();
      } else {
        this.queueRebuildEvent();
      }
      return;
    }

    const internalIndex = Array.isArray(index) ? index : [index];

    // create intersection object of data indices to remove
    for (let i = 0; i < internalIndex.length; i += 1) {
      intersectionIndexMap.add(internalIndex[i]);
    }

    // pivot remove data indices into remove filteredrows indices and dump in
    // hash-object
    for (let i = 0; i < this.resultSet.filteredRows.length; i += 1) {
      if (intersectionIndexMap.has(this.resultSet.filteredRows[i])) {
        filteredRowsIndexMap.add(i);
      }
    }

    // if any of the removed items were in our filteredrows...
    if (Object.keys(filteredRowsIndexMap).length > 0) {
      // remove them from filtered rows
      this.resultSet.filteredRows = this.resultSet.filteredRows.filter(
        (_, idx) => {
          return !filteredRowsIndexMap.has(idx);
        }
      );
      // if persistent...
      if (this.options.persistent) {
        // remove from result data
        this.resultData = this.resultData.filter((_, idx) => {
          return !filteredRowsIndexMap.has(idx);
        });
      }

      // and queue sorts
      if (this.sortFunction || this.sortCriteria || this.sortCriteriaSimple) {
        this.queueSortPhase();
      } else {
        this.queueRebuildEvent();
      }
    }

    // to remove holes, we need to 'shift down' indices, this filter function
    // finds number of positions to shift
    const filter = (internalId: number) => {
      return (compareWith: number) => {
        if (!this.resultSet) {
          throw new CollectionNotReadyError(
            'execute the filter while removing the document'
          );
        }

        return compareWith < this.resultSet.filteredRows[internalId];
      };
    };

    for (let j = 0; j < this.resultSet.filteredRows.length; j += 1) {
      // grab subset of removed elements where data index is less than current
      // filtered row data index;
      // use this to determine how many positions iterated remaining data index
      // needs to be 'shifted down'
      const filteredData = internalIndex.filter(filter(j));
      this.resultSet.filteredRows[j] -= filteredData.length;
    }
  };

  /**
   * data transformation via user supplied functions
   *
   * @param mapFunction - this function accepts a single document for you to
   *        transform and return
   * @param reduceFunction - this function accepts many (array of map outputs)
   *        and returns single value
   * @returns The output of your reduceFunction
   */
  mapReduce = <R0, R1>(
    mapFunction: (x: T) => R0,
    reduceFunction: (x: R0[]) => R1
  ) => reduceFunction(this.data().map(mapFunction));
}
