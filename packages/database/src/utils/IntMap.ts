import { hasOwn } from './hasOwn';

export class IntMap<T> {
  private map: Record<number, T> = {};

  clear = () => {
    const keys = Object.keys(this.map) as unknown as (keyof typeof this.map)[];

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];

      delete this.map[key];
    }
  };

  delete = (key: number) => {
    const result = hasOwn(this.map, key);
    if (!result) return false;

    delete this.map[key];
    return true;
  };

  forEach = (
    callbackfn: (value: T, key: number, map: this) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thisArg?: any
  ) => {
    Object.keys(this.map).forEach((key) => {
      const internalKey = Number(key);
      callbackfn(this.map[internalKey], internalKey, this);
    }, thisArg);
  };

  get = (key: number): T | undefined => {
    return Reflect.get(this.map, key);
  };

  has = (key: number) => {
    return hasOwn(this.map, key);
  };

  set = (key: number, value: T) => {
    Reflect.set(this.map, key, value);
    return this;
  };

  entries = () => {
    return this[Symbol.iterator]();
  };

  *keys() {
    const keys = Object.keys(this.map);

    for (let i = 0; i < keys.length; i += 1) {
      yield Number(keys[i]);
    }
  }

  values = () => {
    return Object.values(this.map)[Symbol.iterator]();
  };

  get size(): number {
    return Object.keys(this.size).length;
  }

  *[Symbol.iterator](): IterableIterator<[number, T]> {
    const values = Object.values(this.map);
    const keys = Object.keys(this.map);

    for (let i = 0; i < values.length; i += 1) {
      yield [Number(keys[i]), values[i]];
    }
  }

  [Symbol.toStringTag] = '[object Map]';
}
