/* eslint-disable import/no-cycle */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { SchemaType } from './SchemaType';

/**
 * Boolean schema type.
 */
export class SchemaTypeBoolean<Document extends boolean> extends SchemaType<
  Document,
  boolean
> {
  /**
   * Transforms data into number to compress the size of database files.
   */
  value(value: Document, _data: unknown) {
    return !!value;
  }
}
