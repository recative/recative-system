import { ICollectionDocument } from './Collection';

export class ExactIndex<T extends object, K extends keyof T> {
  index = new Map<K, Set<T & ICollectionDocument>>();

  constructor(public field: K) {}

  /**
   * add the value you want returned to the key in the index
   */
  add = (key: K, value: T & ICollectionDocument) => {
    const indexSet = this.index.get(key);
    if (indexSet) {
      indexSet.add(value);
    } else {
      this.index.set(key, new Set([value]));
    }
  };

  set = this.add;

  /**
   * remove the value from the index, if the value was the last one, remove
   * the key
   */
  remove = (key: K, value: T & ICollectionDocument) => {
    const indexSet = this.index.get(key);

    if (!indexSet) return;

    indexSet.delete(value);

    if (indexSet.size < 1) {
      this.index.delete(key);
    }
  };

  /**
   * get the values related to the key, could be more than one
   */
  get = (key: K) => {
    return this.index.get(key);
  };

  /**
   * clear will zap the index
   */
  clear = () => {
    this.index.clear();
  };
}
