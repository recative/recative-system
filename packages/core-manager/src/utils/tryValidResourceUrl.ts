/* eslint-disable no-await-in-loop */
/* eslint-disable no-constant-condition */
import objectEntries from 'object.entries';

import { NoMoreURLAvailableError } from './NoMoreURLAvailableError';

export type PostProcessCallback<Result = string> = (
  url: string
) => Promise<Result | null> | (Result | null);
/**
 * Find the valid resource URL via the fetch method.
 * @param x The file generator.
 * @returns The valid resource URL or null.
 */
export const tryValidResourceUrl = async <
  PostProcess extends PostProcessCallback<Result> | undefined,
  Result = string,
>(
  x: Generator<string, void, unknown>,
  postProcess?: PostProcess,
  taskId = Math.random().toString(36),
  logObject: Record<string, string> | undefined = undefined,
): Promise<PostProcess extends undefined ? string | null : Result | null> => {
  while (true) {
    const url = x.next().value;

    if (!url) {
      throw new Error(`Invalid URL: ${url}`);
    }

    const key = logObject
      ? (objectEntries(logObject) as [string, string][])
        .filter(([, value]) => value.includes(url))[0][0]
      : null;

    try {
      const availability = await fetch(url, {
        method: 'HEAD',
        cache: 'no-cache',
      });
      if (availability.ok) {
        if (logObject && typeof key === 'string') {
          logObject[key] = `[OK-${taskId}]\t${url}`;
        }

        if (!postProcess) {
          return url as any;
        }

        const postProcessed = postProcess(url);

        if (postProcessed !== null) {
          return postProcessed as any;
        }
      }
    } catch (e) {
      if (logObject && typeof key === 'string') {
        logObject[key] = `[Error-${taskId}]\t${url}`;
      }

      if (e instanceof NoMoreURLAvailableError) {
        console.error('No more URL available!');
        return null;
      }
    }
  }
};
