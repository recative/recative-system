import { useResourceTracker } from '../hooks/baseHooks';

import type {
  DataSourceNode,
  Subscriber,
  Subscribable,
  DataSourceNodeController,
} from '../types/dataSource';

export const isDataSourceNodeController = <T>(
  x: ReturnType<Subscribable<T>>,
): x is DataSourceNodeController<T> => {
  if (typeof x !== 'object') return false;
  if (x === null) return false;
  if (typeof (x as any).getter !== 'function') return false;

  return true;
};

const isPromise = <T>(x: T | Promise<T>): x is Promise<T> => (
  x && typeof x === 'object' && 'then' in x && typeof x.then === 'function'
);

export class DataSource<T> {
  private internalData: T;

  subscribers: Set<Subscriber<T>>;

  diff: boolean;

  constructor(initialValue: T, diff = true) {
    this.subscribers = new Set();
    this.internalData = initialValue;
    this.diff = diff;
  }

  subscribe = (subscriber: Subscriber<T>) => {
    this.subscribers.add(subscriber);

    return {
      getter: () => this.data,
      unsubscribe: () => this.unsubscribe(subscriber),
    };
  };

  unsubscribe = (subscriber: Subscriber<T>) => {
    this.subscribers.delete(subscriber);
  };

  get data() {
    return this.internalData;
  }

  set data(value) {
    if (this.diff && value === this.internalData) return;

    this.subscribers.forEach((subscriber) => {
      subscriber(value!);
    });

    this.internalData = value;
  }

  dispose = () => {
    this.subscribers.clear();
  };
}

export const useDataSource = <T>(initialValue: T, diff = true) => {
  const resourceTracker = useResourceTracker();
  const dataSource = new DataSource<T>(initialValue, diff);
  resourceTracker.track(dataSource);

  return dataSource;
};

type SubscribedValue<T> = T extends DataSourceNode<infer S>
  ? S
  : T extends Subscribable<infer SS>
    ? SS | null
    : never;

type SelectedValue<T, I, O> = SubscribedValue<T> extends I
  ? O
  : SubscribedValue<T> extends I | null
    ? O | null
    : never;

export const useSelector = <
  I extends T extends Subscribable<infer J> ? J : never,
  O,
  T extends Subscribable<any>,
>(
    subscribe: T,
    selector: (
      inputVal: T extends Subscribable<infer J> ? J : never
    ) => O | Promise<O>,
  ) => {
  const dataSource = useDataSource<O | null>(null);

  const updateData = (data: O | Promise<O>) => {
    if (isPromise(data)) {
      data.then((x) => {
        dataSource.data = x;
      });
    } else {
      dataSource.data = data;
    }
  };

  const controller = subscribe((val) => {
    updateData(selector(val));
  });

  if (isDataSourceNodeController(controller)) {
    updateData(selector(controller.getter()));
  }

  return dataSource.subscribe as DataSourceNode<SelectedValue<T, I, O>>;
};

type CombinedValue<T> = T extends [infer S, ...infer U]
  ? [SubscribedValue<S>, ...CombinedValue<U>]
  : T extends []
    ? []
    : never;

export const useCombinator = <T extends Subscribable<unknown>[]>(
  ...args: T
) => {
  const dataSource = useDataSource<unknown[]>(
    args.map(() => null),
    false,
  );

  args.forEach((subscriber, index) => {
    const controller = subscriber((subscribedData) => {
      dataSource.data[index] = subscribedData;
      // eslint-disable-next-line no-self-assign
      dataSource.data = dataSource.data;
    });

    if (isDataSourceNodeController(controller)) {
      dataSource.data[index] = controller.getter();
    }
  });

  return dataSource.subscribe as DataSourceNode<CombinedValue<T>>;
};
