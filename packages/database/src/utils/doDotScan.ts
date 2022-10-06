import { hasOwn } from './hasOwn';

/**
 * helper function used for dot notation queries.
 *
 * @param root - object to traverse
 * @param paths - array of properties to drill into
 * @param test - evaluation function to test with
 * @param value - comparative value to also pass to (compare) fun
 * @param extra - extra arg to also pass to compare fun
 * @param pathOffset - index of the item in 'paths' to start the sub-scan from
 */
export const dotSubScan = <T, C, E>(
  root: T,
  paths: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  test: (element: any, value: any, extra?: E) => boolean,
  value: C,
  extra: E,
  pathOffset = 0
): boolean => {
  const path = paths[pathOffset];

  let valueFound = false;
  let element;
  if (typeof root === 'object' && root && hasOwn(root, path)) {
    element = Reflect.get(root, path);
  }

  if (pathOffset + 1 >= paths.length) {
    // if we have already expanded out the dot notation,
    // then just evaluate the test function and value on the element
    valueFound = test(element, value, extra);
  } else if (Array.isArray(element)) {
    for (let index = 0, len = element.length; index < len; index += 1) {
      valueFound = dotSubScan(
        element[index],
        paths,
        test,
        value,
        extra,
        pathOffset + 1
      );
      if (valueFound === true) {
        break;
      }
    }
  } else {
    valueFound = dotSubScan(element, paths, test, value, extra, pathOffset + 1);
  }

  return valueFound;
};
