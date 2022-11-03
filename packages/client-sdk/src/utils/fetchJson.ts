import debug from 'debug';

import { ClientSideRequestError } from './ClientSideRequestError';

const log = debug('client:fetch');

export const fetchJson = async <T>(x: string | Response) => {
  const response = typeof x === 'string' ? await fetch(x) : x;
  const url = typeof x === 'string' ? x : x.url;

  if (!response.ok) {
    throw new ClientSideRequestError(url, response.status);
  }

  const data = await response.json();
  log(`fetched ${x}, with data:`, data);
  return data as T;
};
