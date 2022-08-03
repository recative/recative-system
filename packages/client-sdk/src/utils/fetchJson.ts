import debug from 'debug';

const log = debug('client:fetch');

export const fetchJson = async <T>(url: string) => {
  const response = await fetch(url);
  log(`Got response for file: ${url}`);

  const data = await response.json();
  log(`fetched ${url}, with data:`, data);
  return data as T;
};
