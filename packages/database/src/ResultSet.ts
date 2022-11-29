import {
  isDotNotation,
  lens,
  LensResult,
  ValidSimpleLensField,
} from '@recative/lens';

import { Operators } from './Operations';
// eslint-disable-next-line import/no-cycle
import { Collection } from './Collection';
import { hasOwn, isKey } from './utils/hasOwn';
import { CompareFunction } from './DynamicView';
import { compoundEval, sortHelper } from './utils/helpers';
import { resolveTransformParameters } from './utils/resolveTransform';

import type { IQuery } from './typings';
import type { Operator } from './Operations';
import type { ICollectionDocument } from './Collection';

import { dotSubScan } from './utils/doDotScan';
import { clone, CloneMethod } from './utils/clone';

export enum TransformType {
  Find = 'find',
  Where = 'where',
  SimpleSort = 'simpleSort',
  CompoundSort = 'compoundSort',
  Sort = 'sort',
  Limit = 'limit',
  Offset = 'offset',
  Map = 'map',
  EqJoin = 'eqJoin',
  MapReduce = 'mapReduce',
  Update = 'update',
  Remove = 'remove',
}

export interface IFindTransformRequest<T> {
  type: TransformType.Find;
  value: IQuery<T>;
}

export interface IWhereTransformRequest<T> {
  type: TransformType.Where;
  filter: (x: T & ICollectionDocument) => boolean;
}

export interface ISimpleSortTransformRequest<T> {
  type: TransformType.SimpleSort;
  property: keyof T;
  desc?: boolean | undefined;
  options?: Partial<ISimpleSortOptions> | boolean;
}

export interface ICompoundSortTransformRequest<T> {
  type: TransformType.CompoundSort;
  properties: [keyof T, boolean][];
}

export interface ISortTransformRequest<T> {
  type: TransformType.Sort;
  compareFunction: CompareFunction<T & ICollectionDocument>;
}

export interface ILimitTransformRequest {
  type: TransformType.Limit;
  count: number;
}

export interface IOffsetTransformRequest {
  type: TransformType.Offset;
  position: number;
}

export interface IMapTransformRequest<T, R0> {
  type: TransformType.Map;
  mapFunction: (x: T) => R0;
  dataOptions?: IResultSetDataOptions;
}

export interface IEqJoinTransformRequest<T, R0, R1> {
  type: TransformType.EqJoin;
  joinData: R0[];
  leftJoinKey: keyof T | JoinKeyFunction<T>;
  rightJoinKey: keyof R0 | JoinKeyFunction<R0>;
  mapFunction: (left: T, right: R0) => R1;
  dataOptions?: IResultSetDataOptions;
}

export interface IMapReduceTransformRequest<T, R0, R1> {
  type: TransformType.MapReduce;
  mapFunction: (x: T) => R0;
  reduceFunction: (x: R0[]) => R1;
}

export interface IUpdateTransformRequest<T> {
  type: TransformType.Update;
  updateFunction: (x: T & ICollectionDocument) => T & ICollectionDocument;
}

export interface IRemoveTransformRequest {
  type: TransformType.Remove;
}

export interface ITransformRequestMap<
  T extends object,
  R0 extends object = T,
  R1 extends object = T
> {
  [TransformType.Find]: IFindTransformRequest<T>;
  [TransformType.Where]: IWhereTransformRequest<T>;
  [TransformType.SimpleSort]: ISimpleSortTransformRequest<T>;
  [TransformType.CompoundSort]: ICompoundSortTransformRequest<T>;
  [TransformType.Sort]: ISortTransformRequest<T>;
  [TransformType.Limit]: ILimitTransformRequest;
  [TransformType.Offset]: IOffsetTransformRequest;
  [TransformType.Map]: IMapTransformRequest<T, R0>;
  [TransformType.EqJoin]: IEqJoinTransformRequest<T, R0, R1>;
  [TransformType.MapReduce]: IMapReduceTransformRequest<T, R0, R1>;
  [TransformType.Update]: IUpdateTransformRequest<T>;
  [TransformType.Remove]: IRemoveTransformRequest;
}

export type TransformRequest<
  T extends object,
  R0 extends object = T,
  R1 extends object = T
> =
  | IFindTransformRequest<T>
  | IWhereTransformRequest<T>
  | ISimpleSortTransformRequest<T>
  | ICompoundSortTransformRequest<T>
  | ISortTransformRequest<T>
  | ILimitTransformRequest
  | IOffsetTransformRequest
  | IMapTransformRequest<T, R0>
  | IEqJoinTransformRequest<T, R0, R1>
  | IMapReduceTransformRequest<T, R0, R1>
  | IUpdateTransformRequest<T>
  | IRemoveTransformRequest;

type TransformResultImplementation<
  T extends object,
  Type extends TransformType,
  R0 extends object = T,
  R1 extends object = T
> = Type extends TransformType.Map
  ? R0
  : Type extends TransformType.EqJoin
  ? R1
  : Type extends TransformType.MapReduce
  ? R1
  : T;

export type ReadonlyOrNot<T> = Readonly<T> | T;

export type TransformRequestChainResult<
  T extends object,
  Transforms
> = Transforms extends ReadonlyOrNot<
  [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    infer U extends ReadonlyOrNot<TransformRequest<any, infer R0, infer R1>>,
    ...infer Rest
  ]
>
  ? Rest extends []
    ? TransformResultImplementation<T, U['type'], R0, R1>
    : TransformRequestChainResult<
        TransformResultImplementation<T, U['type'], R0, R1>,
        Rest
      >
  : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTransformRequest = TransformRequest<any, any, any>;

export type TransformResult<
  T extends AnyTransformRequest | AnyTransformRequest[] | undefined
> = T extends ReadonlyOrNot<
  infer U extends TransformRequest<infer D, infer R0, infer R1>
>
  ? TransformResultImplementation<D, U['type'], R0, R1>
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends [ReadonlyOrNot<TransformRequest<infer D, any, any>>, ...any[]]
  ? TransformRequestChainResult<D, T>
  : never;

/**
 * if an op is registered in this object, our 'calculateRange' can use it with
 * our binary indices.
 * if the op is registered to a function, we will run that function/op as a 2nd
 * pass filter on results.
 * those 2nd pass filter functions should be similar to LokiOps functions,
 * accepting 2 values to compare.
 */
const firstPassIndexedOps = {
  $aeq: true,
  $dteq: true,
  $gt: true,
  $gte: true,
  $lt: true,
  $lte: true,
  $in: true,
  $between: true,
};

const secondPassIndexedOps = {
  $eq: Operators.$eq,
};

/**
 * @param options - boolean to specify if is-descending, or options object
 * @param desc - whether to sort descending
 * @param disableIndexIntersect - whether we should explicity not use array
 *        intersection.
 * @param forceIndexIntersect - force array intersection (if binary index
 *        exists).
 * @param useJavascriptSorting - whether results are sorted via basic javascript
 *        sort.

 */
export interface ISimpleSortOptions {
  desc: boolean;
  disableIndexIntersect: boolean;
  forceIndexIntersect: boolean;
  useJavascriptSorting: boolean;
}

/**
 * allows specifying 'forceClones' and 'forceCloneMethod' options.
 * @param forceClones - Allows forcing the return of cloned objects even when
 *        the collection is not configured for clone object.
 * @param forceCloneMethod - Allows overriding the default or collection
 *        specified cloning method.
 * @param removeMeta - Will force clones and strip $loki and meta properties
 *        from documents.
 */
export interface IResultSetDataOptions {
  forceClones: boolean;
  forceCloneMethod: CloneMethod;
  removeMeta: boolean;
}

export type JoinKeyFunction<T> = (x: T) => keyof T;

export interface IDefaultEqJoinR0<T> {
  left: T;
  right: T;
}

/**
 * Resultset class allowing chainable queries.
 * Intended to be instanced internally.
 * `Collection.find()`, `Collection.where()`, and `Collection.chain()`
 * instantiate this.
 *
 * @constructor Resultset
 * @param collection - The collection which this Resultset will query against.
 * @example
 *    myCollection.chain()
 *      .find({ 'doors' : 4 })
 *      .where(function(obj) { return obj.name === 'Toyota' })
 *      .data();
 */
export class ResultSet<T extends object> {
  filteredRows: number[] = [];

  filterInitialized = false;

  constructor(public collection: Collection<T>, public options = {}) {
    this.eqJoin = this.eqJoin.bind(this);
  }

  /**
   * Reset the resultset to its initial state.
   *
   * @returns Reference to this resultset, for future chain operations.
   */
  reset = () => {
    if (this.filteredRows.length > 0) {
      this.filteredRows = [];
    }
    this.filterInitialized = false;
    return this;
  };

  /**
   * Override of toJSON to avoid circular references
   */
  toJSON = () => {
    const { collection, ...copy } = this.copy();
    return copy;
  };

  /**
   * Allows you to limit the number of documents passed to next chain operation.
   * A resultset copy() is made to avoid altering original resultset.
   *
   * @param count - The number of documents to return.
   * @returns Returns a copy of the resultset, limited by qty, for subsequent
   *          chain ops.
   * @example
   * // find the two oldest users
   * const result = users.chain().simpleSort("age", true).limit(2).data();
   */
  limit = (count: number) => {
    // if this has no filters applied, we need to populate filteredrows first
    if (!this.filterInitialized && this.filteredRows.length === 0) {
      this.filteredRows = this.collection.prepareFullDocIndex();
    }

    const copy = new ResultSet(this.collection);
    copy.filteredRows = this.filteredRows.slice(0, count);
    copy.filterInitialized = true;
    return copy;
  };

  /**
   * Used for skipping 'pos' number of documents in the resultset.
   *
   * @param position - Number of documents to skip; all preceding documents are
   *        filtered out.
   * @returns Returns a copy of the resultset, containing docs starting at
   *          'position' for subsequent chain ops.
   * @example
   * // find everyone but the two oldest users
   * const result = users.chain().simpleSort("age", true).offset(2).data();
   */
  offset = (position: number) => {
    // if this has no filters applied, we need to populate filteredrows first
    if (!this.filterInitialized && this.filteredRows.length === 0) {
      this.filteredRows = this.collection.prepareFullDocIndex();
    }

    const copy = new ResultSet(this.collection);
    copy.filteredRows = this.filteredRows.slice(position);
    copy.filterInitialized = true;
    return copy;
  };

  /**
   * To support reuse of resultset in branched query situations.
   *
   * @returns Returns a copy of the resultset (set) but the underlying document
   *          references will be the same.
   */
  copy = () => {
    const result = new ResultSet(this.collection);

    if (this.filteredRows.length > 0) {
      result.filteredRows = this.filteredRows.slice();
    }
    result.filterInitialized = this.filterInitialized;

    return result;
  };

  /**
   * Alias of copy()
   */
  branch = this.copy;

  /**
   * executes a named collection transform or raw array of transform steps
   * against the resultset.
   *
   * @param transform - name of collection transform or raw transform array
   * @param parameters - (Optional) object property hash of
   *        parameters, if the transform requires them.
   * @returns either (this) resultset or a clone of of this resultset
   *          (depending on steps)
   * @example
   * users.addTransform('CountryFilter', [
   *   {
   *     type: 'find',
   *     value: {
   *       'country': { $eq: '[%lktxp]Country' }
   *     }
   *   },
   *   {
   *     type: 'simpleSort',
   *     property: 'age',
   *     options: { desc: false}
   *   }
   * ]);
   *
   * const results = users
   *  .chain()
   *  .transform("CountryFilter", { Country: 'fr' })
   *  .data();
   */
  transform = <
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TransformInstance extends TransformRequest<T, any, any>,
    Transform extends
      | TransformInstance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | TransformInstance[]
      | undefined
  >(
    transform?: Transform,
    parameters?: Record<string, unknown>
  ): ResultSet<
    Transform extends undefined ? T : TransformResult<Transform>
  > => {
    // if transform is name, then do lookup first
    let internalTransform: TransformInstance[] = Array.isArray(transform)
      ? transform
      : ([transform] as unknown as TransformInstance[]);

    if (parameters) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      internalTransform = resolveTransformParameters<T, any, any>(
        internalTransform,
        parameters
      ) as TransformInstance[];
    }

    for (let i = 0; i < internalTransform.length; i += 1) {
      const step = internalTransform[i];

      switch (step.type) {
        case TransformType.Find:
          this.find(step.value);
          break;
        case TransformType.Where:
          this.where(step.filter);
          break;
        case TransformType.SimpleSort:
          if (!step.property) {
            throw new TypeError(
              `Property key is not defined, unable to execute the transform`
            );
          }
          this.simpleSort(step.property, step.desc || step.options);
          break;
        case TransformType.CompoundSort:
          this.compoundSort(step.properties);
          break;
        case TransformType.Sort:
          this.sort(step.compareFunction);
          break;
        case TransformType.Limit:
          // limit makes copy so update reference
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return this.limit(step.count) as any;
        case TransformType.Offset:
          // offset makes copy so update reference
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return this.offset(step.position) as any;
        case TransformType.Map:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return this.map(step.mapFunction, step.dataOptions) as any;
        case TransformType.EqJoin:
          return this.eqJoin(
            step.joinData,
            step.leftJoinKey,
            step.rightJoinKey,
            step.mapFunction,
            step.dataOptions
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any;
        // following cases break chain by returning array data so make any of
        // these last in transform steps
        case TransformType.MapReduce:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return this.mapReduce(step.mapFunction, step.reduceFunction as any);
        // following cases update documents in current filtered resultset
        // (use carefully)
        case TransformType.Update:
          this.update(step.updateFunction);
          break;
        case TransformType.Remove:
          this.remove();
          break;
        default:
          break;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this as any;
  };

  /**
   * User supplied compare function is provided two documents to compare.
   * (chainable)
   *
   * @param compareFunction - A javascript compare function used for sorting.
   * @returns Reference to this resultset, sorted, for future chain operations.
   * @example
   * result.sort(function(obj1, obj2) {
   *   if (obj1.name === obj2.name) return 0;
   *   if (obj1.name > obj2.name) return 1;
   *   if (obj1.name < obj2.name) return -1;
   * });
   */
  sort = (compareFunction: CompareFunction<T & ICollectionDocument>) => {
    // if this has no filters applied, just we need to populate filteredrows
    // first
    if (!this.filterInitialized && this.filteredRows.length === 0) {
      this.filteredRows = this.collection.prepareFullDocIndex();
    }

    const wrappedComparer: CompareFunction<number> = ((userComparer, data) => {
      return (a, b) => {
        return userComparer(data[a], data[b]);
      };
    })(compareFunction, this.collection.data);

    this.filteredRows.sort(wrappedComparer);

    return this;
  };

  /**
   * Simpler, loose evaluation for user to sort based on a property name.
   * (chainable).
   * Sorting based on the same lt/gt helper functions used for binary indices.
   *
   * @param property - name of property to sort by.
   * @param options - boolean to specify if is descending, or options object
   * @returns Reference to this resultset, sorted, for future chain operations.
   * @example
   * const results = users.chain().simpleSort('age').data();
   */
  simpleSort = (
    property: keyof T,
    options?: Partial<ISimpleSortOptions> | boolean
  ) => {
    const internalOptions =
      typeof options === 'boolean'
        ? {
            desc: options,
          }
        : {
            desc: false,
            disableIndexIntersect: false,
            forceIndexIntersect: false,
            useJavascriptSorting: false,
          };

    let eff;
    let targetEff = 10;
    const dc = this.collection.data.length;
    const frl = this.filteredRows.length;
    const hasBinaryIndex = hasOwn(this.collection.binaryIndices, property);

    // if nothing in filtered rows array...
    if (frl === 0) {
      // if the filter is initialized to be empty resultset, do nothing
      if (this.filterInitialized) {
        return this;
      }

      // otherwise no filters applied implies all documents, so we need to
      // populate filteredrows first

      // if we have a binary index, we can just use that instead of sorting
      // (again)
      if (hasOwn(this.collection.binaryIndices, property)) {
        // make sure index is up-to-date
        this.collection.ensureIndex(property);
        // copy index values into filteredrows
        this.filteredRows =
          this.collection.binaryIndices[property].values.slice(0);

        if (internalOptions.desc) {
          this.filteredRows.reverse();
        }

        // we are done, return this (resultset) for further chain ops
        return this;
      }
      // otherwise initialize array for sort below

      // build full document index (to be sorted subsequently)
      this.filteredRows = this.collection.prepareFullDocIndex();
    }
    // otherwise we had results to begin with, see if we qualify for index
    // intercept optimization

    // If already filtered, but we want to leverage binary index on sort.
    // This will use custom array intention algorithm.
    else if (!internalOptions.disableIndexIntersect && hasBinaryIndex) {
      // calculate filter efficiency
      eff = dc / frl;

      // when javascript sort fallback is enabled, you generally need more than
      // ~17% of total docs in resultSet before array intersect is determined to
      // be the faster algorithm, otherwise leave at 10% for loki sort.
      if (internalOptions.useJavascriptSorting) {
        targetEff = 6;
      }

      // anything more than ratio of 10:1 (total documents/current results)
      // should use old sort code path
      // So we will only use array intersection if you have more than 10% of
      // total docs in your current resultset.
      if (eff <= targetEff || internalOptions.forceIndexIntersect) {
        const { filteredRows } = this;
        const idSet = new Set<number>();
        // set up hash-object for simple 'inclusion test' with existing
        // (filtered) results
        for (let i = 0; i < frl; i += 1) {
          idSet.add(filteredRows[i]);
        }
        // grab full sorted binary index array
        const pv = this.collection.binaryIndices[property].values;

        // filter by existing results
        this.filteredRows = pv.filter((n) => {
          return idSet.has(n);
        });

        if (internalOptions.desc) {
          this.filteredRows.reverse();
        }

        return this;
      }
    }

    // at this point, we will not be able to leverage binary index so we will
    // have to do an array sort

    // if we have opted to use simplified javascript comparison function...
    if (internalOptions.useJavascriptSorting) {
      return this.sort((obj1, obj2) => {
        if (obj1[property] === obj2[property]) return 0;
        if (obj1[property] > obj2[property]) return 1;
        return -1;
      });
    }

    // otherwise use loki sort which will return same results if column is
    // indexed or not
    const wrappedComparer = ((key, desc, data) => {
      let val1;
      let val2;

      return (a: number, b: number) => {
        if (isDotNotation(key)) {
          val1 = lens(data[a], key, true);
          val2 = lens(data[b], key, true);
        } else {
          val1 = Reflect.get(data[a], key);
          val2 = Reflect.get(data[b], key);
        }
        return sortHelper(val1, val2, desc);
      };
    })(property, internalOptions.desc, this.collection.data);

    this.filteredRows.sort(wrappedComparer);

    return this;
  };

  /**
 * Allows sorting a resultset based on multiple columns.
 * @example
 * // to sort by age and then name (both ascending)
 * resultSet.compoundSort(['age', 'name']);
 * // to sort by age (ascending) and then by name (descending)
 * resultSet.compoundSort(['age', ['name', true]]);
 *
 * @param properties - array of property names or subarray of
 *        `[propertyName, isDesc]` used evaluate sort order
 * @returns Reference to this resultset, sorted, for future chain operations.
 
 */
  compoundSort = (properties: [keyof T, boolean][]) => {
    if (properties.length === 0) {
      throw new Error(
        'Invalid call to compound sort, need at least one property'
      );
    }

    if (properties.length === 1) {
      const property = properties[0];
      if (Array.isArray(property)) {
        return this.simpleSort(property[0], property[1]);
      }
      return this.simpleSort(property, false);
    }

    // unify the structure of 'properties' to avoid checking it repeatedly while
    // sorting
    for (let i = 0, len = properties.length; i < len; i += 1) {
      const prop = properties[i];
      if (!Array.isArray(prop)) {
        properties[i] = [prop, false];
      }
    }

    // if this has no filters applied, just we need to populate filteredrows
    // first
    if (!this.filterInitialized && this.filteredRows.length === 0) {
      this.filteredRows = this.collection.prepareFullDocIndex();
    }

    const wrappedComparer = ((props, data) => {
      return (a: number, b: number) => {
        return compoundEval(props, data[a], data[b]);
      };
    })(properties, this.collection.data);

    this.filteredRows.sort(wrappedComparer);

    return this;
  };

  /**
   * oversee the operation of OR'ed query expressions.
   * OR'ed expression evaluation runs each expression individually against the
   * full collection,
   * and finally does a set OR on each expression's results.
   * Each evaluation can utilize a binary index to prevent multiple linear array
   * scans.
   *
   * @param expressionArray - array of expressions
   * @returns this resultset for further chain ops.
   */
  findOr = (expressionArray: IQuery<T>[]) => {
    let filteredRow = null;
    let filteredRowCount = 0;
    const documents = [];
    const indexes = [];

    // If filter is already initialized, then we query against only those items
    // already in filter.
    // This means no index utilization for fields, so hopefully its filtered to
    // a smallish filteredRows.
    for (let i = 0; i < expressionArray.length; i += 1) {
      // we need to branch existing query to run each filter separately and
      // combine results
      filteredRow = this.branch().find(expressionArray[i]).filteredRows;
      filteredRowCount = filteredRow.length;

      // add any document 'hits'
      for (let j = 0; j < filteredRowCount; j += 1) {
        const index = filteredRow[j];
        if (indexes[index] === undefined) {
          indexes[index] = true;
          documents.push(index);
        }
      }
    }

    this.filteredRows = documents;
    this.filterInitialized = true;

    return this;
  };

  $or = this.findOr;

  /**
   * precompile recursively
   */
  // TODO: LET'S FIX THE TYPING LATER
  static precompileQuery = (operator: Operator, value: unknown) => {
    let internalValue = value;

    // for regex ops, precompile
    if (operator === '$regex') {
      if (Array.isArray(internalValue)) {
        internalValue = new RegExp(internalValue[0], internalValue[1]);
      } else if (!(internalValue instanceof RegExp)) {
        if (typeof internalValue === 'string') {
          internalValue = new RegExp(internalValue);
        } else {
          throw new TypeError('Invalid query value of $regex');
        }
      }
    } else if (typeof internalValue === 'object' && internalValue) {
      const keys = Object.keys(internalValue) as (keyof typeof internalValue)[];
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if (key === '$regex' || typeof internalValue[key] === 'object') {
          Reflect.set(
            internalValue,
            key,
            ResultSet.precompileQuery(key, internalValue[key])
          );
        }
      }
    }

    return internalValue;
  };

  /**
   * oversee the operation of AND'ed query expressions.
   * AND'ed expression evaluation runs each expression progressively against the
   * full collection,
   * internally utilizing existing chained resultset functionality.
   * Only the first filter can utilize a binary index.
   *
   * @param expressionArray - array of expressions
   * @returns this resultset for further chain ops.
   */
  findAnd = (expressionArray: IQuery<T>[]) => {
    // we have already implementing method chaining in this (our Resultset class)
    // so lets just progressively apply user supplied and filters
    for (let i = 0, len = expressionArray.length; i < len; i += 1) {
      if (this.count() === 0) {
        return this;
      }
      this.find(expressionArray[i]);
    }
    return this;
  };

  $and = this.findAnd;

  /**
   * Used for querying via a mongo-style query object.
   *
   * @param query - A mongo-style query object used for filtering current results.
   * @param firstOnly - (Optional) Used by collection.findOne()
   * @returns this ResultSet for further chain ops.
   * @example
   * const over30 = users.chain().find({ age: { $gte: 30 } }).data();
   */
  find = (query?: IQuery<T>, firstOnly: boolean = false): ResultSet<T> => {
    if (this.collection.data.length === 0) {
      this.filteredRows = [];
      this.filterInitialized = true;
      return this;
    }

    const internalQuery = query ?? ('getAll' as const);

    const queryEntryKeys = (
      internalQuery ? Object.keys(internalQuery) : []
    ) as Operator[];

    if (query && queryEntryKeys.length) {
      const filters: IQuery<T>[] = [];

      for (let i = 0; i < queryEntryKeys.length; i += 1) {
        const operatorOrProperty = queryEntryKeys[i];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queryEntry = (query as any)[operatorOrProperty as any];

        const formattedQuery = hasOwn(Operators, operatorOrProperty)
          ? ({ [operatorOrProperty]: queryEntry } as IQuery<T>)
          : ({ [operatorOrProperty]: { $eq: queryEntry } } as IQuery<T>);

        filters.push(formattedQuery);
      }

      if (queryEntryKeys.length > 1) {
        // if more than one expression in single query object,
        // convert implicit $and to explicit $and
        return this.find({ $and: filters } as IQuery<T>, firstOnly);
      }
      const filter = filters[0];
      const queryOperation = Object.keys(filter)[0];
      const queryEntry = Object.values(filter)[0];

      // injecting $and and $or expression tree evaluation here.
      if (queryOperation === '$and' || queryOperation === '$or') {
        if (queryOperation === '$and') {
          this.$and(query as IQuery<T>[]);
        } else if (queryOperation === '$or') {
          this.$or(query as IQuery<T>[]);
        }

        // for chained find with first-only,
        if (firstOnly && this.filteredRows.length > 1) {
          this.filteredRows = this.filteredRows.slice(0, 1);
        }

        return this;
      }

      return this.findDocumentEntry(queryOperation, queryEntry, firstOnly);
    }
    // apply no filters if they want all
    if (firstOnly) {
      if (this.filterInitialized) {
        this.filteredRows = this.filteredRows.slice(0, 1);
      } else {
        this.filteredRows = this.collection.data.length > 0 ? [0] : [];
        this.filterInitialized = true;
      }
    }

    return this;
  };

  /**
   * Internal method which can find single entry
   */
  private findDocumentEntry = <
    P extends ValidSimpleLensField,
    O extends Operator,
    D extends boolean
  >(
    propertyOrOperation: O | P,
    queryEntry: unknown,
    firstOnly: boolean = false,
    usingDotNotation?: D
  ): ResultSet<T> => {
    const result: number[] = [];

    let searchByIndex = false;
    let index = null;

    let value: unknown;

    if (propertyOrOperation === '$regex' || typeof value === 'object') {
      value = ResultSet.precompileQuery(propertyOrOperation as '$regex', value);
    }

    // if an index exists for the property being queried against, use it
    // for now only enabling where it is the first filter applied and prop is
    // indexed
    const doIndexCheck = !this.filterInitialized;

    if (
      doIndexCheck &&
      isKey(queryEntry) &&
      hasOwn(this.collection.binaryIndices, queryEntry) &&
      hasOwn(firstPassIndexedOps, propertyOrOperation)
    ) {
      // this is where our lazy index rebuilding will take place
      // basically we will leave all indexes dirty until we need them
      // so here we will rebuild only the index tied to this property
      // ensureIndex() will only rebuild if flagged as dirty since we are not
      // passing force=true param
      if (this.collection.adaptiveBinaryIndices !== true) {
        this.collection.ensureIndex(queryEntry as keyof T);
      }

      searchByIndex = true;
      index = this.collection.binaryIndices[queryEntry as keyof T];
    }

    // opportunistically speed up $in searches from O(n*m) to O(n*log m)
    if (
      !searchByIndex &&
      propertyOrOperation === '$in' &&
      Array.isArray(value) &&
      typeof Set !== 'undefined'
    ) {
      return this.findDocumentEntry('$inSet', new Set(value), firstOnly);
    }

    // the comparison function
    const operator = Operators[propertyOrOperation as '$in'];

    // "shortcut" for collection data
    const collectionData = this.collection.data;

    // Query executed differently depending on:
    // - whether the property being queried has an index defined
    // - if chained, we handle first pass differently for initial
    //   filteredrows[] population
    //
    // For performance reasons, each case has its own if block to minimize
    // in-loop calculations

    // If the filteredrows[] is already initialized, use it
    if (this.filterInitialized) {
      // currently supporting dot notation for non-indexed conditions only
      if (usingDotNotation) {
        const path = (propertyOrOperation as string).split('.');
        for (let i = 0; i < this.filteredRows.length; i += 1) {
          const rowIndex = this.filteredRows[i];
          const record = collectionData[rowIndex];
          if (dotSubScan(record, path, operator, value, record)) {
            result.push(rowIndex);
            if (firstOnly) {
              this.filteredRows = result;
              return this;
            }
          }
        }
      } else {
        for (let i = 0; i < this.filteredRows.length; i += 1) {
          const rowIndex = this.filteredRows[i];
          const rowData = collectionData[rowIndex];
          if (
            (operator as Function)(
              lens(rowData, propertyOrOperation, usingDotNotation),
              value,
              rowData
            )
          ) {
            result.push(rowIndex);
            if (firstOnly) {
              this.filteredRows = result;
              return this;
            }
          }
        }
      }
    } else if (!searchByIndex) {
      // first chained query so work against data[] but put results in
      // filteredrows if not searching by index

      if (usingDotNotation) {
        const path = (propertyOrOperation as string).split('.');
        for (let i = 0; i < collectionData.length; i += 1) {
          const record = collectionData[i];
          if (dotSubScan(record, path, operator, value, record)) {
            result.push(i);
            if (firstOnly) {
              this.filteredRows = result;
              this.filterInitialized = true;
              return this;
            }
          }
        }
      } else {
        for (let i = 0; i < this.filteredRows.length; i += 1) {
          const record = collectionData[i];

          if (
            (operator as Function)(
              lens(record, propertyOrOperation, usingDotNotation),
              value,
              record
            )
          ) {
            result.push(i);

            if (firstOnly) {
              this.filteredRows = result;
              this.filterInitialized = true;
              return this;
            }
          }
        }
      }
    } else {
      // search by index
      const segment = this.collection.calculateRange(
        propertyOrOperation as O,
        queryEntry as P,
        value as LensResult<T, P, D>,
        usingDotNotation
      );

      if (!index) {
        throw new TypeError('Index is not initialized, it is a bug');
      }
      if (propertyOrOperation !== '$in') {
        for (let i = segment[0]; i <= segment[1]; i += 1) {
          const secondPhaseFilter = Reflect.get(
            secondPassIndexedOps,
            propertyOrOperation
          ) as
            | typeof secondPassIndexedOps[keyof typeof secondPassIndexedOps]
            | undefined;

          if (secondPhaseFilter) {
            // must be a function, implying 2nd phase filtering of results from
            // calculateRange
            const lensValue = lens(
              collectionData[index.values[i]],
              propertyOrOperation as P,
              usingDotNotation
            );

            if (
              lensValue !== undefined &&
              secondPhaseFilter(
                lensValue as unknown as LensResult<T, P, D>,
                value
              )
            ) {
              result.push(index.values[i]);
              if (firstOnly) {
                this.filteredRows = result;
                this.filterInitialized = true;
                return this;
              }
            }
          } else {
            result.push(index.values[i]);
            if (firstOnly) {
              this.filteredRows = result;
              this.filterInitialized = true;
              return this;
            }
          }
        }
      } else {
        for (let i = 0; i < segment.length; i += 1) {
          result.push(index.values[segment[i]]);
          if (firstOnly) {
            this.filteredRows = result;
            this.filterInitialized = true;
            return this;
          }
        }
      }
    }

    this.filteredRows = result;
    // next time work against filteredrows[]
    this.filterInitialized = true;
    return this;
  };

  /**
   * Used for filtering via a javascript filter function.
   *
   * @param filter - A javascript function used for filtering current results
   *        by.
   * @returns this resultset for further chain ops.
   * @example
   * const over30 = users
   *  .chain()
   *  .where((doc) => doc.age >= 30)
   *  .data();
   */
  where = (filter: (x: T & ICollectionDocument) => boolean) => {
    let viewFunction;
    const result = [];

    if (typeof filter === 'function') {
      viewFunction = filter;
    } else {
      throw new TypeError('Argument is not a stored view or a function');
    }
    // If the filteredrows[] is already initialized, use it
    if (this.filterInitialized) {
      let j = this.filteredRows.length;

      while (j >= 0) {
        j -= 1;

        if (viewFunction(this.collection.data[this.filteredRows[j]]) === true) {
          result.push(this.filteredRows[j]);
        }
      }

      this.filteredRows = result;

      return this;
    }
    // otherwise this is initial chained op, work against data, push into
    // filteredrows[]

    let k = this.collection.data.length;

    while (k >= 0) {
      k -= 1;
      if (viewFunction(this.collection.data[k]) === true) {
        result.push(k);
      }
    }

    this.filteredRows = result;
    this.filterInitialized = true;

    return this;
  };

  /**
   * returns the number of documents in the resultset.
   *
   * @returns The number of documents in the resultset.
   
   * @example
   * const over30Count = users.chain().find({ age: { $gte: 30 } }).count();
   */
  count = () => {
    if (this.filterInitialized) {
      return this.filteredRows.length;
    }

    return this.collection.count();
  };

  /**
   * Terminates the chain and returns array of filtered documents
   *
   * @param options - allows specifying 'forceClones' and 'forceCloneMethod'
   *        options.
   * @returns Array of documents in the resultset
   * @example
   * const results = users.chain().find({ age: 34 }).data();
   */
  data = (options?: Partial<IResultSetDataOptions>) => {
    const internalOptions = {
      ...options,
    };

    const result = [];
    const { data } = this.collection;

    // if user opts to strip meta, then force clones and use 'shallow' if
    // 'force' options are not present
    if (internalOptions.removeMeta && !internalOptions.forceClones) {
      internalOptions.forceClones = true;
      internalOptions.forceCloneMethod =
        internalOptions.forceCloneMethod ?? CloneMethod.Shallow;
    }

    // if collection has delta changes active, then force clones and use
    // 'parse-stringify' for effective change tracking of nested objects
    // if collection is immutable freeze and unFreeze takes care of cloning
    if (
      !this.collection.disableDeltaChangesApi &&
      this.collection.disableFreeze
    ) {
      internalOptions.forceClones = true;
      internalOptions.forceCloneMethod = CloneMethod.ParseStringify;
    }

    // if this has no filters applied, just return collection.data
    if (!this.filterInitialized) {
      if (this.filteredRows.length === 0) {
        // determine whether we need to clone objects or not
        if (this.collection.cloneObjects || internalOptions.forceClones) {
          const method =
            internalOptions.forceCloneMethod || this.collection.cloneMethod;
          for (let i = 0; i < data.length; i += 1) {
            const document = clone(data[i], method);

            if (internalOptions.removeMeta) {
              delete document.$loki;
              delete document.meta;
            }

            result.push(document);
          }
          return result;
        }
        // otherwise we are not cloning so return sliced array with same object
        // references

        return data.slice();
      }
      // filteredrows must have been set manually, so use it
      this.filterInitialized = true;
    }

    if (this.collection.cloneObjects || internalOptions.forceClones) {
      const method =
        internalOptions.forceCloneMethod ?? this.collection.cloneMethod;
      for (let i = 0; i < this.filteredRows.length; i += 1) {
        const document = clone(data[this.filteredRows[i]], method);
        if (internalOptions.removeMeta) {
          delete document.$loki;
          delete document.meta;
        }
        result.push(document);
      }
    } else {
      for (let i = 0; i < this.filteredRows.length; i += 1) {
        result.push(data[this.filteredRows[i]]);
      }
    }
    return result;
  };

  /**
   * Used to run an update operation on all documents currently in the
   * resultset.
   *
   * @param updateFunction - User supplied updateFunction(obj) will be executed
   *        for each document object.
   * @returns this resultset for further chain ops.
   
  * @example
  * users.chain().find({ country: 'de' }).update(function(user) {
  *   user.phoneFormat = "+49 AAAA BBBBBB";
  * });
  */
  update = (
    updateFunction: (
      x: T & ICollectionDocument
    ) => (T & ICollectionDocument) | void
  ) => {
    if (typeof updateFunction !== 'function') {
      throw new TypeError('Argument is not a function');
    }

    // if this has no filters applied, we need to populate filteredrows first
    if (!this.filterInitialized && this.filteredRows.length === 0) {
      this.filteredRows = this.collection.prepareFullDocIndex();
    }

    const collectionData = this.collection.data;

    // pass in each document object currently in resultset to user supplied
    // updateFunction
    for (let i = 0; i < this.filteredRows.length; i += 1) {
      // if we have cloning option specified or are doing differential delta
      // changes, clone object first
      if (
        !this.collection.disableFreeze ||
        this.collection.cloneObjects ||
        !this.collection.disableDeltaChangesApi
      ) {
        const document = clone(
          collectionData[this.filteredRows[i]],
          this.collection.cloneMethod
        );
        updateFunction(document);
        this.collection.update(document);
      } else {
        // no need to clone, so just perform update on collection data object
        // instance
        updateFunction(collectionData[this.filteredRows[i]]);
        this.collection.update(collectionData[this.filteredRows[i]]);
      }
    }

    return this;
  };

  /**
   * Removes all document objects which are currently in resultset from
   * collection (as well as resultset)
   *
   * @returns this (empty) resultset for further chain ops.
   * @example
   * // remove users inactive since 1/1/2001
   * users
   *  .chain()
   *  .find({ lastActive: { $lte: new Date("1/1/2001").getTime() } })
   *  .remove();
   */
  remove = () => {
    // if this has no filters applied, we need to populate filteredrows first
    if (!this.filterInitialized && this.filteredRows.length === 0) {
      this.filteredRows = this.collection.prepareFullDocIndex();
    }

    this.collection.removeBatchByPositions(this.filteredRows);

    this.filteredRows = [];

    return this;
  };

  /**
   * data transformation via user supplied functions
   *
   * @param mapFunction - this function accepts a single document for you to
   *        transform and return
   * @param reduceFunction - this function accepts many (array of map outputs)
   *        and returns single value
   * @returns The output of your reduceFunction
   * @example
   * const db = new Database('order.db');
   * const orders = db.addCollection('orders');
   * orders.insert([
   *  { qty: 4, unitCost: 100.00 },
   *  { qty: 10, unitCost: 999.99 },
   *  { qty: 2, unitCost: 49.99 }
   * ]);
   *
   * const mapFn = <T>(doc) => doc.qty * doc.unitCost;
   * const reduceFn = <T>(docs: T[]) => {
   *   const grandTotal = 0;
   *   docs.forEach((orderTotal) => { grandTotal += orderTotal; });
   *   return grandTotal;
   * }
   * const grandOrderTotal = orders.chain().mapReduce(mapFn, reduceFn);
   */
  mapReduce = <R0, R1>(
    mapFunction: (x: T) => R0,
    reduceFunction: (x: R0[]) => R1
  ) => reduceFunction(this.data().map(mapFunction));

  /**
   * Left joining two sets of data. Join keys can be defined or calculated
   * properties eqJoin expects the right join key values to be unique.
   * Otherwise left data will be joined on the last joinData object with
   * that key
   * @param joinData - Data array to join to.
   * @param leftJoinKey - Property name in this result set to join on or a
   *        function to produce a value to join on
   * @param rightJoinKey - Property name in the joinData to join on or a
   *        function to produce a value to join on
   * @param mapFunction - (Optional) A function that receives each matching
   *        pair and maps them into output objects
   * @param dataOptions - options to data() before input to your map function
   * @returns A resultset with data in the format
   *          [{left: leftObj, right: rightObj}]
   * @example
   * const db = new Database('sandbox.db');
   *
   * const products = db.addCollection('products');
   * const orders = db.addCollection('orders');
   *
   * products.insert(
   *  { productId: "100234", name: "flywheel energy storage", unitCost: 19999.99 }
   * );
   * products.insert(
   *  { productId: "140491", name: "300F super capacitor", unitCost: 129.99 }
   * );
   * products.insert(
   *  { productId: "271941", name: "fuel cell", unitCost: 3999.99 }
   * );
   * products.insert(
   *  { productId: "174592", name: "390V 3AH lithium bank", unitCost: 4999.99 }
   * );
   *
   * orders.insert(
   *  {
   *    orderDate: new Date("12/1/2017").getTime(),
   *    prodId: "174592",
   *    qty: 2,
   *    customerId: 2
   *  }
   * );
   * orders.insert(
   *  {
   *    orderDate: new Date("4/15/2016").getTime(),
   *    prodId: "271941",
   *    qty: 1,
   *    customerId: 1
   *  }
   * );
   * orders.insert(
   *  {
   *    orderDate: new Date("3/12/2017").getTime(),
   *    prodId: "140491",
   *    qty: 4,
   *    customerId: 4
   *  }
   * );
   * orders.insert(
   *  {
   *    orderDate: new Date("7/31/2017").getTime(),
   *    prodId: "100234",
   *    qty: 7,
   *    customerId: 3
   *  }
   * );
   * orders.insert(
   *  {
   *    orderDate: new Date("8/3/2016").getTime(),
   *    prodId: "174592",
   *    qty: 3,
   *    customerId: 5
   *  }
   * );
   *
   * const mapFn = <T>(left: T, right: T) => {
   *   return {
   *     orderId: left.$loki,
   *     orderDate: new Date(left.orderDate) + '',
   *     customerId: left.customerId,
   *     qty: left.qty,
   *     productId: left.prodId,
   *     prodName: right.name,
   *     prodCost: right.unitCost,
   *     orderTotal: +((right.unitCost * left.qty).toFixed(2))
   *   };
   * };
   *
   * // join orders with relevant product info via eqJoin
   * const orderSummary = orders
   *  .chain()
   *  .eqJoin(products, "prodId", "productId", mapFn)
   *  .data();
   */
  eqJoin<R = T>(
    joinData: T[] | Collection<T> | ResultSet<T>,
    leftJoinKey: keyof T | JoinKeyFunction<T>,
    rightJoinKey: keyof R | JoinKeyFunction<R>
  ): ResultSet<T>;
  eqJoin<R = T>(
    joinData: T[] | Collection<T> | ResultSet<T>,
    leftJoinKey: keyof T | JoinKeyFunction<T>,
    rightJoinKey: keyof R | JoinKeyFunction<R>,
    mapFunction: undefined,
    dataOptions?: IResultSetDataOptions
  ): ResultSet<T>;
  eqJoin<R = T, R0 extends object = T>(
    joinData: T[] | Collection<T> | ResultSet<T>,
    leftJoinKey: keyof T | JoinKeyFunction<T>,
    rightJoinKey: keyof R | JoinKeyFunction<R>,
    mapFunction: (left: T, right: T) => R0,
    dataOptions?: IResultSetDataOptions
  ): ResultSet<R0>;
  eqJoin<R = T>(
    joinData: T[] | Collection<T> | ResultSet<T>,
    leftJoinKey: keyof T | JoinKeyFunction<T>,
    rightJoinKey: keyof R | JoinKeyFunction<R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapFunction: any = (left: any, right: any) => ({
      left,
      right,
    }),
    dataOptions?: IResultSetDataOptions
  ) {
    let leftData = [];
    let rightData: R[] = [];
    const result: T[] = [];
    const joinMap = new Map<keyof R | R[keyof R], R>();

    // get the left data
    leftData = this.data(dataOptions);

    // get the right data
    if (joinData instanceof Collection) {
      rightData = joinData.chain().data(dataOptions);
    } else if (joinData instanceof ResultSet) {
      rightData = joinData.data(dataOptions);
    } else if (Array.isArray(joinData)) {
      rightData = joinData as unknown as R[];
    } else {
      throw new TypeError('joinData needs to be an array or result set');
    }

    // construct a lookup table
    for (let i = 0; i < rightData.length; i += 1) {
      const key =
        typeof rightJoinKey === 'function'
          ? rightJoinKey(rightData[i])
          : rightData[i][rightJoinKey];
      joinMap.set(key, rightData[i]);
    }

    // Run map function over each object in the resultset
    for (let j = 0; j < leftData.length; j += 1) {
      const key =
        typeof leftJoinKey === 'function'
          ? leftJoinKey(leftData[j])
          : leftData[j][leftJoinKey];
      result.push(mapFunction(leftData[j], joinMap.get(key) || {}));
    }

    // return return a new resultset with no filters
    this.collection = new Collection('joinData');
    this.collection.insert(result);
    this.filteredRows = [];
    this.filterInitialized = false;

    return this;
  }

  /**
   * Applies a map function into a new collection for further chaining.
   * @param mapFunction - javascript map function
   * @param dataOptions - options to data() before input to your map function
   * @example
   * orders.chain().find({ productId: 32 }).map(({ $loki, productId, qty }) => {
   *   return {
   *     orderId: $loki,
   *     productId: productId,
   *     quantity: qty
   *   };
   * });
   */
  map = <R0 extends object>(
    mapFunction: (x: T) => R0,
    dataOptions?: IResultSetDataOptions
  ) => {
    const data = this.data(dataOptions).map(mapFunction);
    // return return a new resultset with no filters
    const newCollection = new Collection<R0>('mappedData');
    const result = new ResultSet<R0>(newCollection, this.options);
    newCollection.insert(data);
    result.filteredRows = [];
    result.filterInitialized = false;

    return result;
  };
}
