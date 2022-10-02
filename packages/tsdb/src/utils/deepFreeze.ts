/* eslint-disable no-restricted-syntax */
/* eslint-disable no-prototype-builtins */

const freeze = (obj: object) => {
  if (!Object.isFrozen(obj)) {
    Object.freeze(obj);
  }
};

export const deepFreeze = (obj: object) => {
  let prop; let
    i;
  if (Array.isArray(obj)) {
    for (i = 0; i < obj.length; i += 1) {
      deepFreeze(obj[i]);
    }
    freeze(obj);
  } else if (obj !== null && (typeof obj === 'object')) {
    for (prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deepFreeze((obj as any)[prop]);
      }
    }
    freeze(obj);
  }
};
