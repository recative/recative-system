export const hasOwn = <T>(object: T, key: string | number | symbol) => {
  return Object.prototype.hasOwnProperty.call(object, key);
};
