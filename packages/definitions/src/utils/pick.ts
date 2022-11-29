type Key = string | number | symbol;

// Copy and pasted from:
// https://stackoverflow.com/questions/47232518/write-a-typesafe-pick-function-in-typescript
export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: Key[] | Readonly<Key[]>
): Pick<T, K> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};

  keys.forEach((key) => {
    if (key in obj) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result[key] = (obj as any)[key];
    }
  });
  return result;
};
