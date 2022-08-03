import { OpenPromise } from './OpenPromise';

export const allSettled = (promises: (Promise<any> | OpenPromise<any>)[]) => {
  const wrappedPromises = promises.map((p) => Promise.resolve(p).then(
    (val) => ({ status: 'fulfilled', value: val }),
    (err) => ({ status: 'rejected', reason: err }),
  ));

  return Promise.all(wrappedPromises);
};
