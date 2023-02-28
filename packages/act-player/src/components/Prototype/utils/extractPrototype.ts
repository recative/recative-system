export const extractPrototype = (
  object: unknown,
  maxLevel = 5,
  level = 0
): unknown => {
  if (typeof object !== 'object' || object === null) {
    return object;
  }

  if (level >= maxLevel) {
    return Object.prototype.toString.call(object);
  }

  const result = {};

  Object.getOwnPropertyNames(object).forEach((key) => {
    let value: unknown;

    try {
      value =
        typeof object === 'object' && object !== null
          ? extractPrototype(Reflect.get(object, key), maxLevel, level + 1)
          : object[key];
      // eslint-disable-next-line no-empty
    } catch (e) {}

    if (value !== undefined) {
      Reflect.set(result, key, value);
    }
  });

  const prototype = Object.getPrototypeOf(object);

  if (!prototype) return result;

  return {
    ...result,
    '[[P]]': extractPrototype(prototype, maxLevel, level + 1),
  };
};
