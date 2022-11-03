import debug from 'debug';
import { parse } from '@recative/ugly-json';

import { ClientSideRequestError } from './ClientSideRequestError';

const log = debug('client:fetch');

export const fetchUson = async <T>(x: string | Response) => {
  const response = typeof x === 'string' ? await fetch(x) : x;
  const url = typeof x === 'string' ? x : x.url;

  if (!response.ok) {
    throw new ClientSideRequestError(url, response.status);
  }

  const raw = await response.text();
  const data = parse(raw) as T;
  log(`fetched ${x}, with data:`, data);
  return data as T;
};
