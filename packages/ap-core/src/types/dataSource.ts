export type Subscriber<T> = (val: T) => void;

export type SubscribeFunction<T> = (subscriber: Subscriber<T>) => void;
export type DataSourceNode<T> = (subscriber: Subscriber<T>) => {
  getter: () => T;
  unsubscribe: () => void;
};
export type DataSourceNodeController<T> = ReturnType<DataSourceNode<T>>;
export type Subscribable<T> = SubscribeFunction<T> | DataSourceNode<T>;
