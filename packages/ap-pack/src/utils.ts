import fs from 'fs';
import JsonStreamStringify from 'json-stream-stringify';

export interface PointMetaData {
  episode: string;
  point: string;
  path: string;
}

export const dumpLargeJSON = (json: unknown, filePath: string) => {
  const jsonStream = new JsonStreamStringify(json, undefined, '\t');
  const fileStream = fs.createWriteStream(filePath, { encoding: 'utf-8' });
  jsonStream.pipe(fileStream);
  return new Promise((res, rej) => {
    jsonStream.on('error', rej);
    fileStream.on('error', rej);
    fileStream.on('finish', res);
  });
};
