import type { DynamicView } from './DynamicView';

export interface ICollectionDocumentDeleteEventDetail<T> {
  document: T;
}

export class CollectionDocumentDeleteEvent<T> extends CustomEvent<
  ICollectionDocumentDeleteEventDetail<T>
> {
  constructor(document: T) {
    super('delete', { detail: { document } });
  }
}

export interface IErrorEventDetail {
  error: unknown;
}

export class ErrorEvent extends CustomEvent<IErrorEventDetail> {
  constructor(error: unknown) {
    super('error', { detail: { error } });
  }
}

export interface IDynamicViewRebuildEventDetail<T extends object> {
  dynamicView: DynamicView<T>;
}

export class DynamicViewRebuildEvent<T extends object> extends CustomEvent<
  IDynamicViewRebuildEventDetail<T>
> {
  constructor(dynamicView: DynamicView<T>) {
    super('error', { detail: { dynamicView } });
  }
}

export class DynamicViewFilterEvent extends CustomEvent<never> {
  constructor() {
    super('filter');
  }
}

export class DynamicViewSortEvent extends CustomEvent<never> {
  constructor() {
    super('sort');
  }
}
