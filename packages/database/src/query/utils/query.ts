/* eslint-disable import/no-cycle */
import { DotNotation, DotNotationValue, lens } from '@recative/lens';

import { SchemaQueryValue, getSchemaMethod } from './getSchema';

export type Query<Document> = Partial<{
  [Key in DotNotation<Document>]:
    | Partial<{
        [K: `$${string}`]: SchemaQueryValue<Document, typeof K>;
      }>
    | DotNotationValue<Document, Key>;
}>;

export class QueryMethodNotFoundError extends Error {
  name = 'QueryMethodNotFound';

  constructor(methodName: string) {
    super(`The method ${methodName} is not found.`);
  }
}
export interface AnyRecord {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const parseObjectQuery = <Document>(
  value: Document,
  query: Query<Document>
) => {
  const queryKeys = Object.keys(query);

  return queryKeys.map((fieldName) => {
    const objectValue = lens(value, fieldName);
    const queryConditions = Reflect.get(query, fieldName);

    const nestedQuery =
      typeof value === 'object' && value !== null && Reflect.get(value, '$q');

    const compareWith =
      typeof nestedQuery === 'string' ? lens(value, nestedQuery) : objectValue;

    if (typeof queryConditions === 'object' && queryConditions !== null) {
      const methodName = Object.keys(query)[0];
      const queryMethod = getSchemaMethod(objectValue, methodName);

      if (methodName !== '$q' && queryMethod) {
        return {
          queryMethod,
          objectValue,
          compareWith: Reflect.get(query, methodName),
        };
      }
    }

    const queryMethod = getSchemaMethod(objectValue, '$eq');

    if (!queryMethod) {
      throw new QueryMethodNotFoundError('$eq');
    }

    return { queryMethod, objectValue, compareWith };
  });
};

export const matchObject = <Document>(
  value: Document,
  query: Query<Document>,
  data: unknown
): boolean => {
  const parsedQuery = parseObjectQuery(value, query);

  for (let i = 0; i < parsedQuery.length; i += 1) {
    const queryElement = parsedQuery[i];

    const elementResult = queryElement.queryMethod(
      queryElement.objectValue,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryElement.compareWith as any,
      data
    );

    if (!elementResult) return false;
  }

  return true;
};

export const $not = <Document>(
  value: Document,
  query: Query<Document>,
  data: unknown
): boolean => {
  return !matchObject(value, query, data);
};

export const $and = <Document>(
  documentEntry: Document,
  queryEntry: Query<Document>[],
  record: unknown
) => {
  for (let i = 0; i < queryEntry.length; i += 1) {
    if (!matchObject(documentEntry, queryEntry[i], record)) {
      return false;
    }
  }
  return true;
};

export const $or = <Document>(
  documentEntry: Document,
  queryEntry: Query<Document>[],
  record: Document
) => {
  for (let i = 0; i < queryEntry.length; i += 1) {
    if (matchObject(documentEntry, queryEntry[i], record)) {
      return true;
    }
  }
  return false;
};

export const combinator = {
  $not,
  $and,
  $or,
};
