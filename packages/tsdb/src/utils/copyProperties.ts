/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const copyProperties = (source: object, destination: object) => {
  for (const prop in source) {
    (destination as any)[prop] = (source as any)[prop];
  }
};
