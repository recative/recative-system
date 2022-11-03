import * as React from 'react';

import { NetworkRequestStatus } from '../constant/NetworkRequestStatus';
import type { IClientSdkConfig } from '../types/IClientSdkConfig';

import { fetchJson } from './fetchJson';
import { fetchBson } from './fetchBson';
import { fetchUson } from './fetchUson';
import { postProcessUrl } from './postProcessUrl';

export const fetch = async <T>(
  fileName: string,
  dataType: 'bson' | 'json' | 'uson',
  pathPattern: string,
  setClientSdkConfig?: React.Dispatch<React.SetStateAction<IClientSdkConfig>>,
  requestId = Math.random().toString(36).replace('0.', 'req-'),
) => {
  const performanceMark = `${fileName}:${requestId}`;
  performance.mark(`${performanceMark}-start`);

  setClientSdkConfig?.((config) => {
    config.requestStatus[fileName] = NetworkRequestStatus.PENDING;
    return config;
  });

  try {
    const url = postProcessUrl(fileName, pathPattern, dataType);

    let result: T;

    switch (dataType) {
      case 'bson':
        result = await fetchBson<T>(url);
        break;
      case 'json':
        result = await fetchJson<T>(url);
        break;
      case 'uson':
        result = await fetchUson<T>(url);
        break;
      default:
        throw new TypeError(`Unknown data type: ${dataType}`);
    }

    setClientSdkConfig?.((config) => {
      config.requestStatus[fileName] = NetworkRequestStatus.SUCCESS;
      return config;
    });

    performance.mark(`${performanceMark}-end`);

    performance.measure(
      performanceMark,
      `${performanceMark}-start`,
      `${performanceMark}-end`
    );

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
