import * as React from 'react';

import { useSdkConfig } from './useSdkConfig';

export const useResetAssetStatusCallback = () => {
  const sdkConfig = useSdkConfig();

  return React.useCallback(() => {
    sdkConfig.setClientSdkConfig((x) => {
      delete x.initialAssetStatus;
      return x;
    });
  }, [sdkConfig.setClientSdkConfig]);
};
