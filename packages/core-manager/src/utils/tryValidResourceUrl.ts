/* eslint-disable no-await-in-loop */
/* eslint-disable no-constant-condition */
// @ts-ignore
import objectEntries from 'object.entries';
import debug from 'debug';

import { NoMoreURLAvailableError } from './NoMoreURLAvailableError';

const logError = debug('core:try-url');
// eslint-disable-next-line no-console
logError.log = console.error.bind(console);

const OK = { ok: true };

export type PostProcessCallback<Result = string, AdditionalData = null> = (
  url: string,
  additionalData?: AdditionalData
) => Promise<Result | null> | (Result | null);
/**
 * Find the valid resource URL via the fetch method.
 * @param x The file generator.
 * @returns The valid resource URL or null.
 */
export const tryValidResourceUrl = async <
  PostProcess extends PostProcessCallback<Result, AdditionalData> | undefined,
  Result = string,
  AdditionalData = undefined
>(
  x: Generator<readonly [string, string], void, unknown>,
  postProcess?: PostProcess,
  additionalData?: AdditionalData,
  trustedUploaders: string[] = [],
  taskId = Math.random().toString(36),
  logObject: Record<string, string> | undefined = undefined
): Promise<PostProcess extends undefined ? string | null : Result | null> => {
  while (true) {
    const match = x.next().value;

    if (!match) {
      throw new Error(`Invalid URL: ${match}`);
    }

    const [url, uploader] = match;

    const key = logObject
      ? (objectEntries(logObject) as [string, string][]).filter(([, value]) =>
          value.includes(url)
        )[0][0]
      : null;

    try {
      const availability = trustedUploaders.includes(uploader)
        ? OK
        : await fetch(url, {
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

        const postProcessed = postProcess(url, additionalData);

        if (postProcessed !== null) {
          return postProcessed as any;
        }
      }
    } catch (e) {
      if (logObject && typeof key === 'string') {
        logObject[key] = `[Error-${taskId}]\t${url}`;
      }

      if (e instanceof NoMoreURLAvailableError) {
        logError(e);
        return null;
      }
    }
  }
};
