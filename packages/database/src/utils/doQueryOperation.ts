// eslint-disable-next-line import/no-cycle
import { Operators } from '../Operations';

import { IQuery } from '../typings';

export const doQueryOperation = <T, R = unknown>(
  value: T[keyof T] | T,
  operations: IQuery<T>,
  record: R
) => {
  const operationKeys = Object.keys(operations);
  const operation = operationKeys[0];

  return Reflect.get(Operators, operation)(
    value,
    Reflect.get(operations, operation),
    record
  );
};
