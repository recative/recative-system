import debug from 'debug';
import { decode } from '@msgpack/msgpack';

import { ClientSideRequestError } from './ClientSideRequestError';

const log = debug('client:fetch');

export const fetchBson = async <T>(url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new ClientSideRequestError(url, response.status);
  }

  const arrayBuffer = await response.arrayBuffer();

  log(`Unpacking the data: ${url}`);
  const data = decode(arrayBuffer);

  log(`fetched ${url}, with data:`, data);
  return data as T;
};
