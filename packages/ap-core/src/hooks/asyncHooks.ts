import { AtomDefinition } from '../core/AtomStore';

import { useStore } from './baseHooks';

export const useAsyncDataSource = <T>(callback: () => Promise<T>) => {
  const dataAtom = AtomDefinition<T | null>(null);
  const [, setData, subscribeDataUpdate] = useStore<T | null>(dataAtom);

  const execute = async (reset?: boolean) => {
    if (reset) setData(null);
    const response = await callback();
    setData(response);
  };

  return [execute, subscribeDataUpdate] as const;
};
