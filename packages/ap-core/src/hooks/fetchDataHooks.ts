import { useStore } from './baseHooks';
import { AtomDefinition } from '../core/AtomStore';
import { isDataSourceNodeController, useDataSource } from '../core/DataSource';

import type { Subscribable } from '../types/dataSource';

/**
 * @deprecated DO NOT USE, use `useQuery`.
 */
export const useRemoteJsonDataSource = <T>(url: string, init?: RequestInit) => {
  const dataAtom = AtomDefinition<T | null>(null);
  const [, setData, subscribeDataUpdate] = useStore<T | null>(dataAtom);

  // Manually triggering fetch is on purpose for better error handling.
  const fetchData = async (reset?: boolean) => {
    if (reset) setData(null);
    const response = await fetch(url, init);
    const body = await response.json();
    setData(body);
  };

  return [fetchData, subscribeDataUpdate] as const;
};

export type QueryResult<V> = {
  success: true,
  data: V,
} | {
  success: false,
  error: unknown,
};

export const defaultQueryFn = async<K, V>(url: K | null) => {
  if (url === null) {
    throw new Error('The url is not specified.');
  }
  const response = await fetch(String(url));
  if (!response.ok) {
    throw new Error(
      `The result is not ok, message:${await response.text()}, status:${response.status} ${response.statusText}.`,
    );
  }
  const body = await response.json();
  return body as V;
};

// Network hook inspired by react-query
export const useQuery = <Key, Value>(
  subscribeQueryKey: Subscribable<Key>,
  queryFn: (key: Key | null) => Promise<Value> = defaultQueryFn,
) => {
  const keyDataSource = useDataSource<Key | null>(null);
  const queryKeyController = subscribeQueryKey((key) => {
    keyDataSource.data = key;
  });
  if (isDataSourceNodeController(queryKeyController)) {
    keyDataSource.data = queryKeyController.getter();
  }
  const resultDataSource = useDataSource<QueryResult<Value> | null>(null);
  let cancelLastRefetch: (() => void) | null = null;
  const refetch = (key: Key | null) => {
    resultDataSource.data = null;
    cancelLastRefetch?.();
    let cancelled = false;
    cancelLastRefetch = () => {
      cancelled = true;
    };
    queryFn(key).then((data) => {
      if (key === keyDataSource.data && !cancelled) {
        resultDataSource.data = {
          success: true,
          data,
        };
      }
    }, (error) => {
      if (key === keyDataSource.data && !cancelled) {
        resultDataSource.data = ({
          success: false,
          error,
        });
      }
    });
  };
  keyDataSource.subscribe(refetch);
  refetch(keyDataSource.data);

  return {
    getResult: () => resultDataSource.data,
    subscribeResultUpdate: resultDataSource.subscribe,
    refetch: () => refetch(keyDataSource.data),
  };
};
