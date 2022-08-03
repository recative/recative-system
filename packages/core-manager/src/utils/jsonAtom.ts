import { persistentAtom } from '@nanostores/persistent';

export const jsonAtom = <T>(key: string, initialValue: T) => {
  return persistentAtom<T>(key, initialValue, {
    encode: JSON.stringify,
    decode: JSON.parse,
  });
};
