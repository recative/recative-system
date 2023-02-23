import { OpenPromise } from './OpenPromise';

/**
 * Converts an array of Promises to an array of objects that represent the
 * settled state of each Promise. A Promise is considered settled if it has
 * either fulfilled or rejected.
 *
 * @param promises - An array of Promises to be settled.
 * @returns A Promise that resolves to an array of objects containing a
 * `status` property that is either "fulfilled" or "rejected", and a
 * corresponding property (`value` for fulfilled Promises, `reason` for rejected
 * Promises).
 */
export const allSettled = (promises: (Promise<any> | OpenPromise<any>)[]) => {
  const wrappedPromises = promises.map((p) =>
    Promise.resolve(p).then(
      (val) => ({ status: 'fulfilled', value: val }),
      (err) => ({ status: 'rejected', reason: err })
    )
  );

  return Promise.all(wrappedPromises);
};
