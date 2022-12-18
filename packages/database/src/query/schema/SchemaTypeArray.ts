/* eslint-disable import/no-cycle */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { SchemaType } from './SchemaType';
import { getSchema } from './utils/getSchema';

/**
 * Array schema type.
 */
export class SchemaTypeArray<
  Document extends Element[],
  Element
> extends SchemaType<Element[], Element[]> {
  /**
   * Compares an array by its child elements and the size of the array.
   *
   * @param a
   * @param b
   */
  compare(a: Document, b: Document): 0 | 1 | -1 {
    if (a) {
      if (!b) return 1;
    } else {
      return b ? -1 : 0;
    }

    const lenA = a.length;
    const lenB = b.length;

    for (let i = 0, len = Math.min(lenA, lenB); i < len; i += 1) {
      const element = a[i];

      const result = getSchema(element).compare(a[i], b[i]);
      if (result !== 0) return result;
    }

    if (lenA === lenB) {
      return 0;
    }

    // Compare by length
    return ((lenA - lenB) / Math.abs(lenA - lenB)) as -1 | 0 | 1;
  }

  /**
   * Transforms data.
   */
  value(value: Document, data: unknown) {
    if (!value) return value;

    const len = value.length;
    if (!len) return [];

    const result = new Array(len);
    for (let i = 0; i < len; i += 1) {
      const element = value[i];

      result[i] = getSchema(element).value(value[i], data);
    }

    return result;
  }

  /**
   * Checks whether the number of elements in an array is equal to `query`.
   */
  q$size(value: Document, query: number, _data: unknown) {
    return (value ? value.length : 0) === query;
  }

  /**
   * Checks whether an array contains one of elements in `query`.
   */
  q$in(value: Document, query: Document[], _data: unknown) {
    if (!value) return false;

    for (let i = 0; i < query.length; i += 1) {
      const element = query[i] as unknown as Element;
      if (value.includes(element)) return true;
    }

    return false;
  }

  /**
   * Checks whether an array does not contain in any elements in `query`.
   */
  q$nin(value: Document, query: Document[], _data: unknown) {
    if (!value) return true;

    for (let i = 0, len = query.length; i < len; i += 1) {
      const element = query[i] as unknown as Element;
      if (value.includes(element)) return false;
    }

    return true;
  }

  /**
   * Checks whether an array contains all elements in `query`.
   */
  q$all(value: Document, query: Document, _data: unknown) {
    if (!value) return false;

    for (let i = 0, len = query.length; i < len; i += 1) {
      if (!value.includes(query[i])) return false;
    }

    return true;
  }

  q$length = this.q$size;
}
