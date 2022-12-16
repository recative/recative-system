export enum CloneMethod {
  ParseStringify = 'parse-stringify',
  Shallow = 'shallow',
  ShallowAssign = 'shallow-assign',
  ShallowRecurseObjects = 'shallow-recurse-objects',
}

export const clone = <T>(
  data: T,
  method: CloneMethod = CloneMethod.ParseStringify
) => {
  if (data === null || data === undefined) {
    return null;
  }

  if (method === CloneMethod.ParseStringify) {
    return JSON.parse(JSON.stringify(data));
  }

  if (method === CloneMethod.Shallow) {
    // more compatible method for older browsers
    const cloned = Object.create(data.constructor.prototype);
    Object.keys(data).forEach((i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cloned as any)[i] = (data as any)[i];
    });

    return cloned;
  }

  if (method === CloneMethod.ShallowAssign) {
    // should be supported by newer environments / browsers
    const cloned = Object.create(data.constructor.prototype);
    Object.assign(cloned, data as T);

    return cloned;
  }

  if (method === CloneMethod.ShallowRecurseObjects) {
    // shallow clone top level properties
    const cloned = clone(data, CloneMethod.Shallow);
    const keys = Object.keys(data);

    // for each of the top level properties which are object literals,
    // recursively shallow copy
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (data as any)[key];

      if (typeof value === 'object' && value.constructor.name === 'Object') {
        cloned[key] = clone(value, CloneMethod.ShallowRecurseObjects);
      } else if (Array.isArray(value)) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        cloned[key] = cloneObjectArray(
          value,
          CloneMethod.ShallowRecurseObjects
        );
      }
    }
  }

  throw new TypeError('Unsupported clone method');
};

export const cloneObjectArray = <T extends object>(
  data: T[],
  method: CloneMethod
) => {
  if (method === CloneMethod.ParseStringify) {
    return clone(data, method);
  }

  const result: T[] = new Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    result[i] = clone(data[i], method);
  }
  return result;
};
