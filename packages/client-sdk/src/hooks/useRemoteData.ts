import React from 'react';

import { useAsync } from '@react-hookz/web';

import { useSdkConfig } from './useSdkConfig';

import { fetch } from '../utils/fetch';

export const useRemoteData = <T>(fileName: string | null) => {
  const { pathPattern, dataType, setClientSdkConfig } = useSdkConfig();

  const fetchData = React.useCallback(
    () => {
      if (!fileName) {
        return Promise.resolve(null);
      }
      return fetch<T>(fileName, dataType, pathPattern, setClientSdkConfig);
    },
    [fileName, pathPattern],
  );

  const [result, controller] = useAsync(fetchData, null);

  return [result, controller] as const;
};
