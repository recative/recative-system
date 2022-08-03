/* eslint-disable no-await-in-loop */
/* eslint-disable no-constant-condition */

import { NoMoreURLAvailableError } from './NoMoreURLAvailableError';

/**
 * Extract URL from a resource URL definition.
 * @param urlMap URL definition
 * @param preferredUploaders All uploaders users need to select
 * @param preferredResolution For multi resolution extraction
 */
export function* selectUrl(
  urlMap: Record<string, string>,
  preferredUploaders: string[],
  preferredResolution?: { width: number; height: number },
  logObject: Record<string, string> | undefined = undefined,
) {
  const urlSpecs = preferredUploaders
    .map((uploader) => {
      if (logObject) {
        if (urlMap[uploader] === undefined) {
          logObject[uploader] = '[Not in `urlMap`]\t-';
        } else {
          logObject[uploader] = '[Idle]\t-';
        }
      }
      return [uploader, urlMap[uploader]];
    })
    .filter(
      ([, url]) =>
        // URL exists
        // eslint-disable-next-line implicit-arrow-linebreak
        url !== undefined,
    );

  let currentIndex = 0;

  const url = new NoMoreURLAvailableError();

  while (true) {
    if (currentIndex >= urlSpecs.length) {
      throw url;
    }

    let urls: { url: string; width: number; height: number }[] = [];

    const urlSpec = urlSpecs[currentIndex][1];
    const uploader = urlSpecs[currentIndex][0];

    if (logObject && !urlSpec) {
      logObject[uploader] = `[Invalid]\t${urlSpec}`;
    }

    const parsedUrl = new URL(urlSpec, window.location.href);
    if (parsedUrl.protocol === 'jb-multipart:') {
      urls = JSON.parse(atob(urlSpec.replace('jb-multipart://', '')));
    } else {
      url.addUrl(urlSpec);

      if (logObject) {
        logObject[uploader] = `[Trying]\t${urlSpec}`;
      }

      yield urlSpec;
      currentIndex += 1;
      continue;
    }

    if (!preferredResolution) {
      url.addUrl(urlSpec);

      if (logObject) {
        logObject[uploader] = `[Trying]\t${urls[0].url}`;
      }

      yield urls[0].url;
      currentIndex += 1;
      continue;
    }

    const result = urls
      .map(({ url: src, width, height }) => ({
        url: src,
        score: Math.min(
          preferredResolution.width - width,
          preferredResolution.height - height,
        ),
      }))
      .sort((a, b) => {
        if (a.score >= 0 && b.score < 0) {
          return -1;
        }
        if (a.score < 0 && b.score >= 0) {
          return 1;
        }
        return Math.abs(a.score) - Math.abs(b.score);
      })[0].url;

    url.addUrl(result);

    if (logObject) {
      logObject[uploader] = `[Trying]\t${result}`;
    }

    yield result;
    currentIndex += 1;
  }
}
