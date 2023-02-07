import * as React from 'react';

type RafFunction = (x: number) => void;

const GLOBAL_RAF_STORE = new Set<RafFunction>();

let STARTED = false;

const rafFn = (x: number) => {
  GLOBAL_RAF_STORE.forEach((f) => f(x));

  if (GLOBAL_RAF_STORE.size) {
    window.requestAnimationFrame(rafFn);
  } else {
    STARTED = false;
  }
};

const start = () => {
  if (STARTED) return;

  STARTED = true;
  window.requestAnimationFrame(rafFn);
};

export const useRaf = (x: RafFunction) => {
  React.useEffect(() => {
    GLOBAL_RAF_STORE.add(x);
    start();

    return () => {
      GLOBAL_RAF_STORE.delete(x);
    };
  }, [x]);
};
