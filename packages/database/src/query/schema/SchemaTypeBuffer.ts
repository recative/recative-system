/* eslint-disable import/no-cycle */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { SchemaType } from './SchemaType';

/**
 * Boolean schema type.
 */
export class SchemaTypeBuffer<Document extends Buffer> extends SchemaType<
  Buffer,
  string
> {
  /**
   * Compares between two buffers.
   */
  compare(a: Document, b: Document) {
    if (Buffer.isBuffer(a)) {
      return Buffer.isBuffer(b) ? a.compare(b) : 1;
    }

    return Buffer.isBuffer(b) ? -1 : 0;
  }

  /**
   * Transforms value. This function is used when saving data to database files.
   */
  value(value: Document, _data: unknown) {
    return Buffer.isBuffer(value) ? value.toString() : String(value);
  }

  /**
   * Checks the equality of data.
   */
  q$eq(value: Buffer, query: Buffer, _data: unknown) {
    if (Buffer.isBuffer(value) && Buffer.isBuffer(query)) {
      return value.equals(query);
    }

    return value === query;
  }

  /**
   * Checks the equality of data. Returns true if the value doesn't match.
   */
  q$ne(value: Buffer, query: Buffer, _data: unknown) {
    return !this.q$eq(value, query, _data);
  }
}
