export interface ICollectionDocumentDeleteEventDetail<T> {
  document: T;
}

export class CollectionDocumentDeleteEvent<T>
  extends CustomEvent<ICollectionDocumentDeleteEventDetail<T>> {
  constructor(document: T) {
    super('delete', { detail: { document } });
  }
}

export interface IErrorEventDetail {
  error: unknown;
}

export class ErrorEvent
  extends CustomEvent<IErrorEventDetail> {
  constructor(error: unknown) {
    super('error', { detail: { error } });
  }
}
