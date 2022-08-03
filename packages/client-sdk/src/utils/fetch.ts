import * as React from 'react';

import { NetworkRequestStatus } from '../constant/NetworkRequestStatus';
import type { IClientSdkConfig } from '../types/IClientSdkConfig';

import { fetchJson } from './fetchJson';
import { fetchBson } from './fetchBson';
import { postProcessUrl } from './postProcessUrl';

export const fetch = async <T>(
  fileName: string,
  dataType: 'bson' | 'json',
  pathPattern: string,
  setClientSdkConfig?: React.Dispatch<React.SetStateAction<IClientSdkConfig>>,
) => {
  setClientSdkConfig?.((config) => {
    config.requestStatus[fileName] = NetworkRequestStatus.PENDING;
    return config;
  });

  try {
    const url = postProcessUrl(fileName, pathPattern);

    const result = await (
      dataType === 'bson'
        ? fetchBson<T>(url)
        : fetchJson<T>(url)
    );

    setClientSdkConfig?.((config) => {
      config.requestStatus[fileName] = NetworkRequestStatus.SUCCESS;
      return config;
    });

    return result;
  } catch (e) {
    console.error(e);

    setClientSdkConfig?.((config) => {
      config.requestStatus[fileName] = NetworkRequestStatus.FAILURE;
      return config;
    });

    return null;
  }
};
