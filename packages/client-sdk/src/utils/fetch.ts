import * as React from 'react';

import { NetworkRequestStatus } from '../constant/NetworkRequestStatus';
import type { IClientSdkConfig } from '../types/IClientSdkConfig';

import { fetchJson } from './fetchJson';
import { fetchBson } from './fetchBson';
import { fetchUson } from './fetchUson';
import { postProcessUrl } from './postProcessUrl';
import { ClientSideRequestError } from './ClientSideRequestError';

const responseCache = new Map<string, Response>();
const resultCache = new Map<string, unknown>();

export type DataType = 'bson' | 'json' | 'uson';

const getCacheKey = (
  fileName: string,
  dataType: DataType,
  pathPattern: string,
) => {
  return `${fileName}~${dataType}~${pathPattern}`;
}

export const cache = async (
  fileName: string,
  dataType: DataType,
  pathPattern: string,
) => {
  const cacheKey = getCacheKey(fileName, dataType, pathPattern);

  if (resultCache.has(cacheKey)) return;

  const cachedResponse = responseCache.get(cacheKey);

  if (cachedResponse && cachedResponse.ok) return;

  const url = postProcessUrl(fileName, pathPattern, dataType);

  const response = await window.fetch(url);

  if (!response.ok) {
    throw new ClientSideRequestError(url, response.status);
  }

  responseCache.set(cacheKey, response);
};

export const fetch = async <T>(
  fileName: string,
  dataType: DataType,
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

  const cacheKey = getCacheKey(fileName, dataType, pathPattern);

  const cachedResult = resultCache.get(cacheKey);
  if (cachedResult) return cachedResult as T;

  const cachedResponse = responseCache.get(cacheKey);
  responseCache.delete(cacheKey);

  try {
    const url = postProcessUrl(fileName, pathPattern, dataType);

    let result: T;

    const request = cachedResponse && cachedResponse.ok ? cachedResponse : url;

    switch (dataType) {
      case 'bson':
        result = await fetchBson<T>(request);
        break;
      case 'json':
        result = await fetchJson<T>(request);
        break;
      case 'uson':
        result = await fetchUson<T>(request);
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

    if (result && cachedResponse) {
      resultCache.set(cacheKey, result);
    }

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
