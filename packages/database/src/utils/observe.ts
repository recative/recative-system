type ObserveHandler<T> = (data: T) => void;

const IS_OBSERVED = Symbol('observed');

const IS_PROXIED = Symbol('proxied');

const ORIGINAL = Symbol('original');

export const isObservable = <T extends object>(x: T): x is T => {
  return !!Reflect.get(x, IS_OBSERVED);
};

export const suspenseObserve = <T extends object>(x: T): T => {
  const isProxied = Reflect.get(x, IS_PROXIED);

  if (isProxied) {
    Reflect.set(x, IS_OBSERVED, false);
  }

  return x;
};

export const observe = <T extends object>(
  data: T,
  listener: ObserveHandler<T>,
): T => {
  if (Reflect.get(data, IS_PROXIED)) {
    return observe(Reflect.get(data, ORIGINAL), listener) as T;
  }

  let observed = true;

  const handler = {
    get: (target: object, key: string | number | symbol): unknown => {
      if (key === IS_OBSERVED) {
        return observed;
      }

      if (key === IS_PROXIED) {
        return IS_PROXIED;
      }

      if (key === ORIGINAL) {
        return data;
      }

      const value = Reflect.get(target, key);
      if (typeof value === 'object' && value !== null) {
        return new Proxy(value, handler);
      }

      return value;
    },

    set(target: object, key: string | number | symbol, value: unknown) {
      if (!observed) {
        listener(data);
      }

      if (key === IS_OBSERVED) {
        observed = !!value;

        return true;
      }

      return Reflect.set(target, key, value);
    },
  };

  return new Proxy(data, handler) as T;
};
