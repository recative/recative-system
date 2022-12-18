/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * This is the basic schema type.
 * All schema types should inherit from this class.
 * For example:
 *
 * ``` TypeScript
 * class SchemaTypeCustom extends SchemaType {};
 * ```
 *
 * **Query operators**
 *
 * To add a query operator, defines a method whose name is started with `q$`.
 * For example:
 *
 * ``` TypeScript
 * SchemaTypeCustom.q$foo = function(value, query, data){
 *   // ...
 * };
 * ```
 *
 * The `value` parameter is the value of specified field; the `query` parameter
 * is the value passed to the query operator; the `data` parameter is the
 * complete data.
 *
 * The return value must be a boolean indicating whether the data passed.
 */
export class SchemaType<Document, SerializedType = string> {
  /**
   * Compares data. This function is used when sorting.
   */
  compare(a: Document, b: Document): 0 | 1 | -1 {
    if (a > b) {
      return 1;
    }
    if (a < b) {
      return -1;
    }

    return 0;
  }

  /**
   * Transforms value. This function is used when saving data to database files.
   *
   * @param value
   * @param _data
   */
  value(value: Document, _data: unknown): SerializedType {
    const valueType = typeof value;

    if (
      valueType === 'string' ||
      valueType === 'number' ||
      valueType === 'boolean'
    ) {
      return value as unknown as SerializedType;
    }

    return String(value) as unknown as SerializedType;
  }

  /**
   * Checks the equality of data.
   */
  q$eq(value: Document, query: Document, _data: unknown) {
    return value === query;
  }

  /**
   * Checks the loose equality of data.
   */
  q$aeq(value: Document, query: Document, _data: unknown) {
    // eslint-disable-next-line eqeqeq
    return value == query;
  }

  /**
   * Checks the equality of data. Returns true if the value doesn't match.
   */
  q$ne(value: Document, query: Document, _data: unknown) {
    return !this.q$eq(value, query, _data);
  }

  /**
   * Checks whether `value` is greater than (i.e. >) the `query`.
   */
  q$gt(value: Document, query: Document, _data: unknown) {
    return value > query;
  }

  /**
   * Checks whether `value` is greater than or equal to (i.e. >=) the `query`.
   */
  q$gte(value: Document, query: Document, _data: unknown) {
    return value >= query;
  }

  /**
   * Checks whether `value` is less than (i.e. <) the `query`.
   */
  q$lt(value: Document, query: Document, _data: unknown) {
    return value < query;
  }

  /**
   * Checks whether `value` is less than or equal to (i.e. <=) the `query`.
   */
  q$lte(value: Document, query: Document, _data: unknown) {
    return value <= query;
  }

  /**
   * Checks whether `value` is less than or equal to (i.e. <=) the `query`.
   */
  q$between(value: Document, query: [Document, Document], _data: unknown) {
    return (
      this.q$gt(value, query[0], _data) && this.q$lt(value, query[1], _data)
    );
  }

  /**
   * Checks whether `value` is equal to one of elements in `query`.
   */
  q$in(value: Document, query: Document[] | Set<Document>, _data: unknown) {
    return Array.isArray(query) ? query.includes(value) : query.has(value);
  }

  /**
   * Checks whether `value` is not equal to any elements in `query`.
   */
  q$nin(value: Document, query: Document[] | Set<Document>, _data: unknown) {
    return !this.q$in(value, query, _data);
  }

  /**
   * Checks the existence of data.
   *
   * @param value
   * @param query
   * @param _data
   */
  q$exist(value: Document | null, query: Document, _data: unknown) {
    if (value === null) return false;

    return value === query;
  }

  q$exists = this.q$exist;

  q$max = this.q$lte;

  q$min = this.q$gte;
}
