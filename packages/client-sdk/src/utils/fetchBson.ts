import debug from 'debug';
import { decode } from '@msgpack/msgpack';

import { ClientSideRequestError } from './ClientSideRequestError';

const log = debug('client:fetch');

export const fetchBson = async <T>(x: string | Response) => {
  const response = typeof x === 'string' ? await fetch(x) : x;
  const url = typeof x === 'string' ? x : x.url;

  if (!response.ok) {
    throw new ClientSideRequestError(url, response.status);
  }

  const arrayBuffer = await response.arrayBuffer();

  log(`Unpacking the data: ${x}`);
  const data = decode(arrayBuffer);

  log(`fetched ${x}, with data:`, data);
  return data as T;
};
