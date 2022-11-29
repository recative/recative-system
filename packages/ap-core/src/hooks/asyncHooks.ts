import { AtomDefinition } from '../core/AtomStore';

import { useStore } from './baseHooks';

export class UnknownError extends Error {
  name = 'UnknownError';

  constructor(public detail: unknown) {
    super('Received an unknown error, check `detail` for the error body');
  }
}

export const useAsyncDataSource = <T>(callback: () => Promise<T>) => {
  const dataAtom = AtomDefinition<T | null>(null);
  const errorAtom = AtomDefinition<Error | null>(null);

  const [, setData, subscribeDataUpdate] = useStore(dataAtom);
  const [, setError, subscribeErrorUpdate] = useStore(errorAtom);

  const execute = async (reset?: boolean) => {
    if (reset) setData(null);
    try {
      const response = await callback();
      setData(response);
    } catch (error) {
      if (error instanceof Error) {
        setError(error);
      } else {
        setError(new UnknownError(error));
      }
    }
  };

  return [execute, subscribeDataUpdate, subscribeErrorUpdate] as const;
};
