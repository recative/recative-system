import React from 'react';

import { ClientSdkContext } from '../context';

export class SdkContextNotAvailableError extends Error {
  constructor() {
    super('SdkContext is not available');
  }
}

export const useSdkConfig = () => {
  const sdkConfig = React.useContext(ClientSdkContext);

  if (!sdkConfig) {
    throw new SdkContextNotAvailableError();
  }

  return sdkConfig;
};

export const useEpisodes = () => {
  const { episodesMap } = useSdkConfig();

  return episodesMap;
};
