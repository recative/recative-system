import { ICollectionDocument } from '../Collection';
import { hasOwn } from './hasOwn';

export const ensureDocumentType = <T extends object>(
  x: T
): T & ICollectionDocument => {
  if (!hasOwn(x, '$loki')) {
    throw new TypeError('`$loki` field not found.');
  }

  if (!hasOwn(x, 'meta')) {
    throw new TypeError('`meta` field not found.');
  }

  const meta = Reflect.get(x, 'meta') as Record<string, unknown>;

  if (typeof meta !== 'object' || meta === null) {
    throw new TypeError('`meta` is not an object.');
  }

  if (typeof meta.created !== 'number') {
    throw new TypeError('`meta.created` is not a number.');
  }

  if (typeof meta.version !== 'number') {
    throw new TypeError('`meta.version` is not a number.');
  }

  if (typeof meta.revision !== 'number') {
    throw new TypeError('`meta.revision` is not a number.');
  }

  return x as unknown as T & ICollectionDocument;
};
