/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { SchemaType } from '../schema/SchemaType';

import { SchemaTypeArray } from '../schema/SchemaTypeArray';
import { SchemaTypeBoolean } from '../schema/SchemaTypeBoolean';
import { SchemaTypeBuffer } from '../schema/SchemaTypeBuffer';
import { SchemaTypeDate } from '../schema/SchemaTypeDate';
import { SchemaTypeString } from '../schema/SchemaTypeString';
import { combinator } from './query';

export type Schema<T> = T extends Array<infer U>
  ? SchemaTypeArray<T, U>
  : T extends boolean
  ? SchemaTypeBoolean<T>
  : T extends Buffer
  ? SchemaTypeBuffer<T>
  : T extends Date
  ? SchemaTypeDate<T>
  : T extends string
  ? SchemaTypeString<T>
  : SchemaType<T>;

export const getSchema = <T>(x: T): Schema<T> => {
  if (Array.isArray(x)) return new SchemaTypeArray() as Schema<T>;
  return new SchemaType() as Schema<T>;
};

interface ISchemaClass {
  [key: `q$${string}`]: (value: any, query: any, data: any) => any;
}

export type SchemaMethod<T, M extends string> = M extends `$${infer Method}`
  ? Schema<T> extends ISchemaClass
    ? Schema<T>[`q$${Method}`]
    : never
  : never;

export type SchemaQueryValue<T, M extends string> = SchemaMethod<T, M> extends (
  value: any,
  query: infer Q,
  data: any
) => any
  ? Q
  : never;

export const getSchemaMethod = <T, M extends string>(
  x: T,
  method: M
):
  | ((value: T, query: SchemaQueryValue<T, M>, data: unknown) => boolean)
  | undefined => {
  const combinatorMethod = Reflect.get(combinator, method);
  if (combinatorMethod) return combinatorMethod;

  return Reflect.get(getSchema(x), `q${method}`) as SchemaMethod<T, M>;
};
