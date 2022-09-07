import debug from 'debug';

import { ClientSideRequestError } from './ClientSideRequestError';

const log = debug('client:fetch');

export const fetchJson = async <T>(url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new ClientSideRequestError(url, response.status);
  }

  const data = await response.json();
  log(`fetched ${url}, with data:`, data);
  return data as T;
};
