import { isDotNotation } from '@recative/lens';

import * as Comparators from './Comparators';

import { hasOwn } from './utils/hasOwn';
import { IQuery } from './typings';

export const doQueryOperation = (
  type: unknown,
  operations: IQuery<unknown>,
  record: unknown
): boolean => {
  const operationKeys = Object.keys(operations);
  const operation = operationKeys[0];

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return Reflect.get(Operators, operation)?.(
    type,
    Reflect.get(operations, operation),
    record
  ) ?? false;
};

type ContainsQuery<DocumentEntry> = DocumentEntry extends string
  ? string
  : DocumentEntry extends ArrayLike<infer R>
  ? R
  : DocumentEntry extends object
  ? keyof DocumentEntry
  : never;

const containsChecker = <T>(documentEntry: T) => {
  if (typeof documentEntry === 'string' || Array.isArray(documentEntry)) {
    return (queryEntry: ContainsQuery<T>) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentEntry.includes(queryEntry as any);
  }
  if (typeof documentEntry === 'object' && documentEntry !== null) {
    return (queryEntry: ContainsQuery<T>) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hasOwn(documentEntry, queryEntry as any);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (_: ContainsQuery<T>) => false;
};

/**
 * dotSubScan - helper function used for dot notation queries.
 *
 * @param root - object to traverse
 * @param paths - array of properties to drill into
 * @param test - evaluation function to test with
 * @param value - comparative value to also pass to (compare) fun
 * @param extra - extra arg to also pass to compare fun
 * @param offset - index of the item in 'paths' to start the sub-scan from
 */
const dotSubScan = <T, E>(
  root: T,
  paths: string[],
  test: (element: unknown, value: unknown, extra: E) => unknown,
  value: unknown,
  extra: E,
  offset?: number
): boolean => {
  const pathOffset = offset || 0;
  const path = paths[pathOffset];

  let valueFound = false;
  let element;
  if (typeof root === 'object' && root && hasOwn(root, path)) {
    element = Reflect.get(root, path);
  }
  if (pathOffset + 1 >= paths.length) {
    // if we have already expanded out the dot notation,
    // then just evaluate the test function and value on the element
    valueFound = !!test(element, value, extra);
  } else if (Array.isArray(element)) {
    for (let index = 0, len = element.length; index < len; index += 1) {
      valueFound = dotSubScan(
        element[index],
        paths,
        test,
        value,
        extra,
        pathOffset + 1
      );
      if (valueFound === true) {
        break;
      }
    }
  } else {
    valueFound = dotSubScan(element, paths, test, value, extra, pathOffset + 1);
  }

  return valueFound;
};

type Type =
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'symbol'
  | 'undefined'
  | 'object'
  | 'function'
  | 'array'
  | 'date';

export const Operators = {
  /**
   * If two values are qual.
   */
  $eq: <T extends object, K extends keyof T>(
    documentEntry: T[K],
    queryEntry: T[K]
  ) => {
    return documentEntry === queryEntry;
  },

  /**
   * abstract/loose equality
   */
  $aeq: <T extends object, K extends keyof T>(
    documentEntry: T[K],
    queryEntry: T[K]
  ) => {
    // eslint-disable-next-line eqeqeq
    return documentEntry == queryEntry;
  },

  /**
   * Not equals to
   */
  $ne: <T extends object, K extends keyof T>(
    documentEntry: T[K],
    queryEntry: T[K]
  ) => {
    if (Number.isNaN(documentEntry) && Number.isNaN(queryEntry)) {
      return true;
    }

    return queryEntry !== documentEntry;
  },

  /**
   * date equality / abstract equality test
   */
  $dteq: (documentEntry: Date, queryEntry: Date) => {
    return Comparators.aeq(documentEntry, queryEntry);
  },

  /**
   * Return identical un-indexed results as indexed comparisons
   */
  $gt: (documentEntry: number, queryEntry: number) => {
    return Comparators.gt(documentEntry, queryEntry, false);
  },

  $gte: (documentEntry: number, queryEntry: number) => {
    return Comparators.gt(documentEntry, queryEntry, true);
  },

  $lt: (documentEntry: number, queryEntry: number) => {
    return Comparators.lt(documentEntry, queryEntry, false);
  },

  $lte: (documentEntry: number, queryEntry: number) => {
    return Comparators.lt(documentEntry, queryEntry, true);
  },

  /**
   * lightweight javascript comparisons
   */
  $jgt: (documentEntry: number, queryEntry: number) => {
    return documentEntry > queryEntry;
  },

  $jgte: (documentEntry: number, queryEntry: number) => {
    return documentEntry >= queryEntry;
  },

  $jlt: (documentEntry: number, queryEntry: number) => {
    return documentEntry < queryEntry;
  },

  $jlte: (documentEntry: number, queryEntry: number) => {
    return documentEntry <= queryEntry;
  },

  $between: (documentEntry: number, queryEntry: [number, number]) => {
    if (documentEntry === undefined || documentEntry === null) return false;
    return (
      Comparators.gt(documentEntry, queryEntry[0], true) &&
      Comparators.lt(documentEntry, queryEntry[1], true)
    );
  },

  $jbetween: (documentEntry: number, queryEntry: [number, number]) => {
    if (documentEntry === undefined || documentEntry === null) return false;
    return documentEntry >= queryEntry[0] && documentEntry <= queryEntry[1];
  },

  $in: <T>(documentEntry: T, queryEntry: T[]) => {
    return queryEntry.includes(documentEntry);
  },

  $inSet: <T>(documentEntry: T, queryEntry: Set<T>) => {
    return queryEntry.has(documentEntry);
  },

  $nin: <T>(documentEntry: T, queryEntry: T[]) => {
    return !queryEntry.includes(documentEntry);
  },

  $keyin: (documentEntry: string | number | symbol, queryEntry: object) => {
    return documentEntry in queryEntry;
  },

  $nkeyin: (documentEntry: string | number | symbol, queryEntry: object) => {
    return !(documentEntry in queryEntry);
  },

  $definedin: (documentEntry: string | number | symbol, queryEntry: object) => {
    return Reflect.get(queryEntry, documentEntry) !== undefined;
  },

  $undefinedin: (
    documentEntry: string | number | symbol,
    queryEntry: object
  ) => {
    return Reflect.get(queryEntry, documentEntry) === undefined;
  },

  $regex: (documentEntry: string, queryEntry: RegExp) => {
    return queryEntry.test(documentEntry);
  },

  $containsString: (documentEntry: string, queryEntry: string) => {
    return (
      typeof documentEntry === 'string' && documentEntry.includes(queryEntry)
    );
  },

  $containsAny: <T>(documentEntry: T[], queryEntry: T) => {
    const checker = containsChecker(documentEntry);

    if (checker !== null) {
      return Array.isArray(queryEntry)
        ? queryEntry.some(checker)
        : checker(queryEntry);
    }

    return false;
  },

  $containsNone: <T>(documentEntry: T[], queryEntry: T) => {
    return Operators.$containsAny(documentEntry, queryEntry);
  },

  $contains: <T>(documentEntry: T, queryEntry: ContainsQuery<T>) => {
    const checker = containsChecker(documentEntry);

    if (checker !== null) {
      return Array.isArray(queryEntry)
        ? queryEntry.every(checker)
        : checker(queryEntry);
    }
    return false;
  },

  $elemMatch: <T extends object>(
    documentEntry: T[],
    queryEntry: IQuery<any>
  ) => {
    if (Array.isArray(documentEntry)) {
      return documentEntry.some((item) => {
        return Object.keys(queryEntry).every((property) => {
          let filter = Reflect.get(queryEntry, property);

          if (!(typeof filter === 'object' && filter)) {
            filter = { $eq: filter };
          }

          if (isDotNotation(property)) {
            return dotSubScan(
              item,
              property.split('.'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              doQueryOperation as any,
              Reflect.get(queryEntry, property),
              item
            );
          }

          return doQueryOperation(
            Reflect.get(item, property),
            filter,
            item
          );
        });
      });
    }
    return false;
  },

  $type: <T, R>(documentEntry: T, queryEntry: Type, record: R) => {
    let type: string = typeof documentEntry;
    if (type === 'object') {
      if (Array.isArray(documentEntry)) {
        type = 'array';
      } else if (documentEntry instanceof Date) {
        type = 'date';
      }
    }
    return typeof queryEntry !== 'object'
      ? type === queryEntry
      : doQueryOperation(type, queryEntry, record);
  },

  $finite: (documentEntry: number, queryEntry: boolean) => {
    return queryEntry === Number.isFinite(documentEntry);
  },

  $size: <T, R>(documentEntry: T, queryEntry: number, record: R) => {
    if (Array.isArray(documentEntry)) {
      return typeof queryEntry !== 'object'
        ? documentEntry.length === queryEntry
        : doQueryOperation(documentEntry.length, queryEntry, record);
    }
    return false;
  },

  $len: <R>(
    documentEntry: ArrayLike<unknown>,
    queryEntry: number | IQuery<any>,
    record: R
  ) => {
    if (typeof documentEntry === 'string') {
      return typeof queryEntry !== 'object'
        ? documentEntry.length === queryEntry
        : doQueryOperation(documentEntry.length, queryEntry, record);
    }
    return false;
  },

  $where: <T>(documentEntry: T, queryEntry: (x: T) => boolean) => {
    return !!queryEntry(documentEntry);
  },

  $not: <R>(documentEntry: unknown, queryEntry: IQuery<any>, record: R) => {
    return !doQueryOperation(documentEntry, queryEntry, record);
  },

  $and: <R>(documentEntry: unknown, queryEntry: IQuery<any>[], record: R) => {
    for (let i = 0; i < queryEntry.length; i += 1) {
      if (!doQueryOperation(documentEntry, queryEntry[i], record)) {
        return false;
      }
    }
    return true;
  },

  $or: <R>(documentEntry: unknown, queryEntry: IQuery<any>[], record: R) => {
    for (let i = 0; i < queryEntry.length; i += 1) {
      if (doQueryOperation(documentEntry, queryEntry[i], record)) {
        return true;
      }
    }
    return false;
  },

  $exists: (documentEntry: unknown, queryEntry: unknown) => {
    if (queryEntry) {
      return documentEntry !== undefined;
    }
    return documentEntry === undefined;
  }
};

export type Operator = keyof typeof Operators;

export const isOperation = (x: string): x is Operator => hasOwn(Operators, x);

export interface QueryEntry<DocumentEntry> {
  $eq: DocumentEntry;
  $aeq: DocumentEntry;
  $ne: DocumentEntry;
  $dteq: DocumentEntry extends number | string | Date ? Date : never;
  $gt: DocumentEntry extends number ? number : never;
  $gte: DocumentEntry extends number ? number : never;
  $lt: DocumentEntry extends number ? number : never;
  $lte: DocumentEntry extends number ? number : never;
  $jgt: DocumentEntry extends number ? number : never;
  $jgte: DocumentEntry extends number ? number : never;
  $jlt: DocumentEntry extends number ? number : never;
  $jlte: DocumentEntry extends number ? number : never;
  $between: DocumentEntry extends number ? [number, number] : never;
  $jbetween: DocumentEntry extends number ? [number, number] : never;
  $in: DocumentEntry[];
  $inSet: Set<DocumentEntry>;
  $nin: DocumentEntry[];
  $keyin: DocumentEntry extends object ? keyof DocumentEntry : never;
  $nkeyin: DocumentEntry extends object ? keyof DocumentEntry : never;
  $definedin: DocumentEntry extends object ? keyof DocumentEntry : never;
  $undefinedin: DocumentEntry extends object ? keyof DocumentEntry : never;
  $regex: DocumentEntry extends string ? RegExp : never;
  $containsString: DocumentEntry extends string ? string : never;
  $containsAny: DocumentEntry extends ArrayLike<infer E> ? E : never;
  $containsNone: DocumentEntry extends ArrayLike<infer E> ? E : never;
  $contains: DocumentEntry extends ArrayLike<infer E> ? E : never;
  $elemMatch: DocumentEntry extends ArrayLike<infer E>
    ? E extends object
      ? IQuery<E>
      : never
    : never;
  $type: Type;
  $finite: DocumentEntry extends number ? boolean : never;
  $size: DocumentEntry extends ArrayLike<any> | Set<any> ? number : never;
  $len: DocumentEntry extends ArrayLike<any> ? number : never;
  $where: (x: DocumentEntry) => boolean;
  $not: IQuery<DocumentEntry>;
  $and: IQuery<DocumentEntry>[];
  $or: IQuery<DocumentEntry>[];
  $exists: unknown;
}
