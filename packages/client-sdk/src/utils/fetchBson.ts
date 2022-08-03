import debug from 'debug';
import { decode } from '@msgpack/msgpack';

const log = debug('client:fetch');

export const fetchBson = async <T>(url: string) => {
  const response = await fetch(url);
  log(`Got response for file: ${url}`);

  const arrayBuffer = await response.arrayBuffer();

  log(`Unpacking the data: ${url}`);
  const data = decode(arrayBuffer);

  log(`fetched ${url}, with data:`, data);
  return data as T;
};
