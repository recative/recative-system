/* eslint-disable import/no-cycle */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { SchemaType } from './SchemaType';

/**
 * String schema type.
 */
export class SchemaTypeString<Document extends string> extends SchemaType<
  Document,
  string
> {
  /**
   * Checks the equality of data.
   */
  match(value: unknown, query: string | RegExp, _data: unknown) {
    if (!value || !query) {
      return value === query;
    }

    if (query instanceof RegExp) {
      return query.test(String(value));
    }

    return value === query;
  }

  /**
   * Checks whether a string is equal to one of elements in `query`.
   */
  q$in(value: Document, query: Document[], data: unknown) {
    for (let i = 0, len = query.length; i < len; i += 1) {
      if (this.match(value, query[i], data)) return true;
    }

    return false;
  }

  /**
   * Checks whether a string is not equal to any elements in `query`.
   */
  q$nin(value: Document, query: Document[], data: unknown) {
    return !this.q$in(value, query, data);
  }

  /**
   * Checks length of a string.
   */
  q$length(value: Document, query: number, _data: unknown) {
    return (value ? value.length : 0) === query;
  }
}
