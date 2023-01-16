/* eslint-disable import/no-cycle */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { SchemaType } from './SchemaType';

/**
 * Date schema type.
 */
export class SchemaTypeDate<Document extends Date> extends SchemaType<
  Document,
  string
> {
  /**
   * Checks the equality of data.
   */
  match(value: Document, query: Document, _data: unknown) {
    if (!value || !query) {
      return value === query;
    }

    return value.getTime() === query.getTime();
  }

  /**
   * Compares between two dates.
   *
   * @param a
   * @param b
   */
  compare(a: Document, b: Document) {
    if (a) {
      if (b) {
        const diff = Number(a) - Number(b);

        return (diff / Math.abs(diff)) as -1 | 0 | 1;
      }

      return 1 as const;
    }

    return b ? (-1 as const) : (0 as const);
  }

  /**
   * Transforms a date object to a string.
   *
   * @param value
   * @param _data
   */
  value(value: Document, _data: unknown): string {
    return value ? value.toISOString() : (value as unknown as string);
  }

  /**
   * Finds data by its date.
   */
  q$day(value: Document, query: number, _data: unknown) {
    return value ? value.getDate() === query : false;
  }

  /**
   * Finds data by its month. (Start from 0)
   */
  q$month(value: Document, query: number, _data: unknown) {
    return value ? value.getMonth() === query : false;
  }

  /**
   * Finds data by its year. (4-digit)
   */
  q$year(value: Document, query: number, _data: unknown) {
    return value ? value.getFullYear() === query : false;
  }
}
