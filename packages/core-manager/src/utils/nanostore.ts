import {
  atom, computed, ReadableAtom, WritableAtom,
} from 'nanostores';

export const readonlyAtom = <T>(input: ReadableAtom<T>) => {
  return computed(input, (v) => v);
};

export const distinctAtom = <T>(input: ReadableAtom<T>) => {
  const output = atom(input.get());
  input.listen((v) => {
    if (v !== output.get()) {
      output.set(v);
    }
  });
  return readonlyAtom(output);
};

export interface ThrottledAtomReturnType<T>{
  atom: ReadableAtom<T>;
  forceUpdate: () => void;
}

export const throttledAtom = <T>(
  input: ReadableAtom<T>, interval: number = 200,
): ThrottledAtomReturnType<T> => {
  const output = atom(input.get());
  let lastUpdateTime = performance.now();
  const update = () => {
    lastUpdateTime = performance.now();
    output.set(input.get());
  };
  input.listen(() => {
    if (performance.now() - lastUpdateTime > interval) {
      update();
    }
  });
  return { atom: readonlyAtom(output), forceUpdate: update };
};

export const connect = <T>(source: ReadableAtom<T>, target: WritableAtom<T>) => {
  source.subscribe((x) => { target.set(x); });
};
