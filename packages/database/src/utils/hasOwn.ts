export const isKey = (x: unknown): x is string | number | symbol => {
  const type = typeof x;

  return type === 'string' || type === 'number' || type === 'symbol';
};

export const hasOwn = <T>(object: T, key: string | number | symbol) => {
  return Object.prototype.hasOwnProperty.call(object, key);
};
