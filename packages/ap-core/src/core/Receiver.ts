import { isDataSourceNodeController } from './DataSource';
import type { Subscribable } from '../types/dataSource';

export const Receiver = <T extends {}>(x: T) => {
  const connect = <P extends keyof T>(
    target: P,
    // eslint-disable-next-line no-unused-vars
    subscribeFn: Subscribable<T[P]>,
  ) => {
    if (!(target in x)) {
      throw new TypeError(`Can't find property ${String(target)}.`);
    }

    const valueUpdateCallback = (val: T[P]) => {
      x[target] = val;
    };

    const nodeController = subscribeFn(valueUpdateCallback);

    if (isDataSourceNodeController(nodeController)) {
      const initialValue = nodeController.getter();
      valueUpdateCallback(initialValue);
    }

    return { connect };
  };

  return { connect };
};
