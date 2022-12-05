/* eslint-disable no-restricted-syntax */
/* eslint-disable no-prototype-builtins */
import { hasOwn } from './hasOwn';
import { clone, CloneMethod } from './clone';

export const freeze = <T>(object: T): T => {
  if (!Object.isFrozen(object)) {
    return Object.freeze(object);
  }

  return object;
};

export const deepFreeze = <T>(object: T): T => {
  let prop;
  let i;
  if (Array.isArray(object)) {
    for (i = 0; i < object.length; i += 1) {
      deepFreeze(object[i]);
    }
    return freeze(object);
  }

  if (object !== null && typeof object === 'object') {
    for (prop in object) {
      if (object.hasOwnProperty(prop)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deepFreeze((object as any)[prop]);
      }
    }
    return freeze(object);
  }

  return object;
};

export const unFreeze = <T extends object>(object: T): T => {
  if (!Object.isFrozen(object)) {
    return object;
  }
  return clone(object, CloneMethod.Shallow);
};

export const deepUnFreeze = <T extends object | null>(object: T): T => {
  if (object === null) {
    return null as unknown as T;
  }

  if (Array.isArray(object)) {
    return object.map(deepUnFreeze) as T;
  }

  if (object != null && typeof object === 'object') {
    const result = {} as unknown as T;

    for (const property in object) {
      if (hasOwn(object, property)) {
        Reflect.set(result as object, property, Reflect.get(Object, property));
      }
    }

    return result;
  }

  return object;
};

export const isFrozen = <T extends object>(object: T | null) => {
  if (object === null) return false;

  if (Array.isArray(object)) {
    if (!Object.isFrozen(object)) {
      return false;
    }
    for (let i = 0; i < object.length; i += 1) {
      if (!isFrozen(object[i])) {
        return false;
      }
    }
  } else if (object !== null && typeof object === 'object') {
    if (!Object.isFrozen(object)) {
      return false;
    }

    for (const property in object) {
      if (
        hasOwn(object, property) &&
        !isFrozen(Reflect.get(object as object, property))
      ) {
        return false;
      }
    }
  }
  return true;
};
