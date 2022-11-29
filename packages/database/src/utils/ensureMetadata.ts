export interface IDocumentMetadata {
  created: number;
  revision: number;
  version?: number;
  updated?: number;
}

export const ensureMetadata = <T>(x: T): T & { meta: IDocumentMetadata } => {
  if (typeof x !== 'object' || x === null) {
    throw new TypeError('Invalid document content');
  }

  const internalX = x as T & { meta: IDocumentMetadata };

  if ('meta' in x) {
    if (typeof internalX.meta.created !== 'number') {
      internalX.meta.created = Date.now();
    }

    if (typeof internalX.meta.revision !== 'number') {
      internalX.meta.revision = 0;
    }

    return internalX;
  }

  internalX.meta = {
    created: Date.now(),
    revision: 0,
  };

  return internalX;
};
