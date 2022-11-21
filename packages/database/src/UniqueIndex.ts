import { lens } from '@recative/lens';
import type { LensResult, ValidSimpleLensField } from '@recative/lens';

import { IntMap } from './utils/IntMap';

import type { ICollectionDocument } from './Collection';

export class UniqueIndex<T extends object, K extends ValidSimpleLensField> {
  keyMap = new Map<
    LensResult<(T & ICollectionDocument), K, true>,
    T & ICollectionDocument
  >();

  lokiMap = new IntMap<LensResult<(T & ICollectionDocument), K, true>>();

  constructor(public readonly field: K) {}

  set = (object: T & ICollectionDocument) => {
    const fieldValue = lens(object, this.field, true);
    if (fieldValue !== null && typeof fieldValue !== 'undefined') {
      if (this.keyMap.get(fieldValue)) {
        throw new Error(
          `Duplicate key for property ${String(this.field)}: ${fieldValue}`
        );
      } else {
        this.keyMap.set(fieldValue, object);
        this.lokiMap.set(object.$loki, fieldValue);
      }
    }
  };

  get = (key: LensResult<(T & ICollectionDocument), K, true>) => {
    return this.keyMap.get(key);
  };

  byId = (id: number) => {
    const document = this.lokiMap.get(id);
    if (!document) return document;

    return this.keyMap.get(document);
  };

  /**
   * Updates a document's unique index given an updated object.
   * @param originalDocument Original document object
   * @param newDocument New document object (likely the same as obj)
   */
  update = (
    originalDocument: T & ICollectionDocument,
    newDocument: T & ICollectionDocument
  ) => {
    if (this.lokiMap.get(originalDocument.$loki) !== lens(newDocument, this.field, true)) {
      const oldField = this.lokiMap.get(originalDocument.$loki);
      this.set(newDocument);
      // make the old key fail bool test, while avoiding the use of delete (mem-leak prone)
      if (oldField) {
        this.keyMap.delete(oldField);
      }
    } else {
      const lensValue = lens(originalDocument, this.field, true);

      if (lensValue) {
        this.keyMap.set(lensValue, newDocument);
      }
    }
  };

  remove = (key: LensResult<(T & ICollectionDocument), K, true>) => {
    const document = this.keyMap.get(key);
    if (document !== null && typeof document !== 'undefined') {
      // avoid using `delete`
      this.keyMap.delete(key);
      this.lokiMap.delete(document.$loki);
    } else {
      throw new Error(`Key is not in unique index: ${String(this.field)}`);
    }
  };

  clear = () => {
    this.keyMap = Object.create(null);
    this.lokiMap = Object.create(null);
  };
}
