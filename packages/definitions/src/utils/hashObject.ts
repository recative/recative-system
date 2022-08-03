import { h32 } from 'xxhashjs';

const sortObjectKeys = <T extends object>(object: T): T => {
  const sortedObject = {} as unknown as T;

  const keys = Object.keys(object).sort();

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i] as unknown as keyof T;

    sortedObject[key] = object[key];
  }
  return sortedObject;
};

export const hashObject = <T extends object>(object: T) => h32(
  JSON.stringify(sortObjectKeys(object)), 0x1bf52,
).toString(16);
