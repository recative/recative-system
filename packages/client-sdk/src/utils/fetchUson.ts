import debug from 'debug';
import { parse } from '@recative/ugly-json';

const log = debug('client:fetch');

export const fetchUson = async <T>(url: string) => {
  const response = await fetch(url);

  const raw = await response.text();
  const data = parse(raw) as T;
  log(`fetched ${url}, with data:`, data);
  return data as T;
};
