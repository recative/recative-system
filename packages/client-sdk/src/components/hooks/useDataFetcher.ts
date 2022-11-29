import * as React from 'react';

import { useSdkConfig } from '../../hooks/useSdkConfig';
import { fetch } from '../../utils/fetch';

import type { IEpisodeDetail } from '../../external';

export const useDataFetcher = () => {
  const {
    pathPattern: internalPathPattern,
    dataType: internalDataType,
    setClientSdkConfig,
  } = useSdkConfig();

  const fetchData = React.useCallback(
    (fileName: string) => fetch(
      fileName,
      internalDataType,
      internalPathPattern,
      setClientSdkConfig,
    ) as Promise<IEpisodeDetail>,
    [internalDataType, internalPathPattern, setClientSdkConfig],
  );

  return fetchData;
};
