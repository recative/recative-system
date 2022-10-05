export const delay = <P>(x: () => P, time = 1): Promise<P> => {
  return new Promise<P>((resolve, reject) => {
    globalThis.setTimeout(() => {
      if (typeof x === 'function') {
        resolve(x());
      } else {
        reject(
          new TypeError('Argument passed for async execution is not a function')
        );
      }
    }, time);
  });
};
