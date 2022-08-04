import { persistentAtom } from '@nanostores/persistent';
import { atom } from 'nanostores';

export const jsonAtom = <T>(key: string, defaultValue: T) => {
  const rawJsonAtom = persistentAtom<T>(key, defaultValue, {
    encode: JSON.stringify,
    decode: JSON.parse,
  });
  const realJsonAtom = atom(rawJsonAtom.get() ?? defaultValue);
  const { set } = realJsonAtom;
  rawJsonAtom.subscribe((x) => { set(x ?? defaultValue); });
  realJsonAtom.set = (value) => {
    rawJsonAtom.set(value ?? defaultValue);
  };
  return realJsonAtom;
};
