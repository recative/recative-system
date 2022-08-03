type Key = string | number | symbol;

// Copy and pasted from:
// https://stackoverflow.com/questions/47232518/write-a-typesafe-pick-function-in-typescript
export const pick = <T, K extends keyof T>(
  obj: T,
  keys: Key[] | Readonly<Key[]>,
): Pick<T, K> => {
  const result: any = {};
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = (obj as any)[key];
    }
  });
  return result;
};
