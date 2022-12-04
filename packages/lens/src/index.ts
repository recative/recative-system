export type ValidLensField =
  | string
  | number
  | symbol
  | undefined
  | string[]
  | Readonly<string[]>;

export type ValidSimpleLensField = string | number | symbol;

export type ValidDotNotation<T> = T extends `${string}.${string}`
  ? true
  : false;

export const isDotNotation = <T extends ValidLensField>(
  field: T
): ValidDotNotation<T> => {
  if (typeof field !== 'string') {
    return false as ValidDotNotation<T>;
  }

  return field.includes('.') as ValidDotNotation<T>;
};

// Dot notation related typings comes from:
// https://twitter.com/diegohaz/status/1309489079378219009

type DotNotationImplementation<T, K extends keyof T> = K extends string
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T[K] extends Record<string, any>
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      T[K] extends ArrayLike<any>
      ?
          | K
          | `${K}.${DotNotationImplementation<
              T[K],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Exclude<keyof T[K], keyof any[]>
            >}`
      : K | `${K}.${DotNotationImplementation<T[K], keyof T[K]>}`
    : K
  : never;

export type DotNotation<T> = DotNotationImplementation<T, keyof T> | keyof T;

export type DotNotationValue<
  T,
  P extends DotNotation<T>
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends DotNotation<T[K]>
      ? DotNotationValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : T extends ArrayLike<infer E> | Readonly<ArrayLike<infer E>>
  ? P extends `${number}`
    ? E
    : number
  : never;

type PathValue<T, K extends string[] | Readonly<string[]>> = K extends
  | [infer O]
  | Readonly<[infer O]>
  ? O extends keyof T
    ? T[O]
    : never
  : K extends [infer E, ...infer R] | Readonly<[infer E, ...infer R]>
  ? E extends keyof T
    ? R extends string[] | Readonly<string[]>
      ? PathValue<T[E], R>
      : never
    : never
  : never;

export type LensResult<T, P, U> = U extends true
  ? P extends string
    ? P extends DotNotation<T>
      ? DotNotationValue<T, P>
      : never
    : P extends string[] | Readonly<string[]>
    ? PathValue<T, P>
    : P extends number
    ? T extends ArrayLike<infer E> | Readonly<ArrayLike<infer E>>
      ? E
      : never
    : P extends symbol
    ? P extends keyof T
      ? T[P]
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never;

/**
 * By default (if usingDotNotation is false), looks up path in
 * object via `object[path]`
 *
 * If `usingDotNotation` is true, then the path is assumed to
 * represent a nested path. It can be in the form of an array of
 * field names, or a period delimited string. The function will
 * look up the value of object[path[0]], and then call
 * result[path[1]] on the result, etc etc.
 *
 * If `usingDotNotation` is true, this function still supports
 * non nested fields.
 *
 * `usingDotNotation` is a performance optimization. The caller
 * may know that a path is *not* nested. In which case, this
 * function avoids a costly string.split('.')
 *
 * examples:
 * getIn({a: 1}, "a") => 1
 * getIn({a: 1}, "a", true) => 1
 * getIn({a: {b: 1}}, ["a", "b"], true) => 1
 * getIn({a: {b: 1}}, "a.b", true) => 1
 */
export const lens = <T, P extends ValidLensField, U extends boolean>(
  object: T,
  path: P,
  usingDotNotation: U = isDotNotation<P>(path) as U
): LensResult<T, P, U> | undefined => {
  if (object === null || object === undefined) {
    return undefined;
  }

  if (!usingDotNotation) {
    if (typeof path !== 'string') {
      throw new TypeError(
        'The path should be a string if not using not notation option'
      );
    }
    return Reflect.get(object, path) as LensResult<T, P, U>;
  }

  if (
    usingDotNotation &&
    (typeof path === 'number' || typeof path === 'symbol')
  ) {
    throw new TypeError(
      'Unable to use dot notation with number or symbol path'
    );
  }

  if (typeof path === 'number' || typeof path === 'symbol') {
    return Reflect.get(object, path) as LensResult<T, P, U>;
  }

  const internalPath =
    typeof path === 'string' ? path.split('.') : (path as unknown as string);

  let index = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastItem: any = object;
  while (object != null && index < internalPath.length) {
    lastItem = lastItem[internalPath[index]];
    index += 1;
  }
  return index && index === internalPath.length ? lastItem : undefined;
};
