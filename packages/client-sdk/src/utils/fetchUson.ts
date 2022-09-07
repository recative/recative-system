import debug from 'debug';
import { parse } from '@recative/ugly-json';

import { ClientSideRequestError } from './ClientSideRequestError';

const log = debug('client:fetch');

export const fetchUson = async <T>(url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new ClientSideRequestError(url, response.status);
  }

  const raw = await response.text();
  const data = parse(raw) as T;
  log(`fetched ${url}, with data:`, data);
  return data as T;
};
