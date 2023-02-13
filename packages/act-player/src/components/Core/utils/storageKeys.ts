import * as keyDefinitions from '../constants/storageKeys';

type KeyDefinition = typeof keyDefinitions;

const defaultKeys = Object.keys(
  keyDefinitions
) as KeyDefinition[keyof KeyDefinition][];

const containsN = (n: number) => (string: string, contains: string) => {
  let hit = 0;
  for (let i = 0; i < string.length - contains.length + 1; i += 1) {
    const subStr = string.substr(i, contains.length);

    if (subStr === contains) {
      hit += 1;
    }

    if (hit >= n) {
      return true;
    }
  }

  return false;
};

const contains2 = containsN(2);

export const getRecativeConfigurations = () => {
  const result = new Map<string, Map<string, Map<string, string>>>();

  const keys = new Set();
  for (let i = 0; i < defaultKeys.length; i += 1) {
    keys.add(defaultKeys[i]);
  }

  const localStorageKeys = Object.keys(localStorage);

  for (let i = 0; i < localStorageKeys.length; i += 1) {
    const k = localStorageKeys[i];

    if (!k.startsWith('@')) continue;
    if (!contains2(k, '/')) continue;

    keys.add(k);
  }

  // eslint-disable-next-line no-restricted-syntax
  const localStorageKeysArray = [...localStorageKeys];
  for (let i = 0; i < localStorageKeys.length; i += 1) {
    const k = localStorageKeysArray[i];
    const v = localStorage.getItem(k) ?? '';

    const [domain, product, key] = k.split('/');

    if (!domain || !product || !key) continue;

    const productMap =
      result.get(domain) ?? new Map<string, Map<string, string>>();

    const keyMap = productMap.get(product) ?? new Map<string, string>();

    productMap.set(product, keyMap);
    result.set(domain, productMap);
    keyMap.set(key, v);
  }

  return result;
};

export const forEachConfig = (
  config: Map<string, Map<string, Map<string, string>>>,
  fn: (
    compoundKey: string,
    value: string,
    domain: string,
    product: string,
    key: string,
    keyMap: Map<string, string>
  ) => void
) => {
  config.forEach((productMap, domain) => {
    productMap.forEach((keyMap, product) => {
      keyMap.forEach((value, key) => {
        fn(
          `${domain}~~~${product}~~~${key}`,
          value,
          domain,
          product,
          key,
          keyMap
        );
      });
    });
  });
};
