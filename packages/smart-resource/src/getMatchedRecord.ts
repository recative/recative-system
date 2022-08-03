import debug from 'debug';

import { parseSelector } from './parseSelector';
import { calculateResourceScore } from './calculateResourceScore';

export interface ResourceEntry<T> {
  selector: string[];
  item: T;
}

const log = debug('smart-resource:match');

/**
 * Get the matched record from the resource list.
 * @param resources The resource list.
 * @param envConfig Environment variable of current system.
 * @returns Matched asset.
 *
 * @example
 * ```ts
 * const resources = [
 *   { selector: ['lang:zh-Hans', 'client:web'], item: "https://exmaple.com/zh/web.html"},
 *   { selector: ['lang:zh-Hans', 'client:app'], item: "https://exmaple.com/zh/app.html"},
 *   { selector: ['lang:en', 'client:web'], item: "https://exmaple.com/en/web.html"},
 *   { selector: ['lang:en', 'client:app'], item: "https://exmaple.com/en/app.html"},
 * ];
 * const envConfig = {
 *   lang: 'zh-Hans',
 *   category: 'image',
 *   client: 'app',
 * };
 * const weights = {
 *   lang: 1,
 * };
 * const matchedRecord = getMatchedRecord(resources, envConfig, weights);
 * ```
 */
export const getMatchedResource = <T>(
  resources: ResourceEntry<T>[],
  envConfig: Record<string, string>,
  weights: Record<string, number> | null = null,
  taskId = 'select-task',
) => {
  const trueWeights = weights ?? {};

  if (!weights) {
    const keys = Object.keys(envConfig);

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      trueWeights[key] = 1;
    }
  }

  const assetScores = resources
    .map(({ selector }) => calculateResourceScore(
      parseSelector(selector),
      envConfig,
      trueWeights,
    ));

  if (localStorage.getItem('@recative/smart-resource/report-match-score')) {
    const table = resources
      .map((x, i) => ({ ...x, score: assetScores[i] }))
      .sort((a, b) => b.score - a.score)
      .map((x) => `${x.score}\t${x.selector.join(', ')}\t${x.item}`)
      .join('\r\n');

    const title = `${taskId}\r\n${new Array(taskId.length + 1).fill('=').join('')}\r\n\r\n`;
    const header = 'score\tselector\titem\r\n';
    const sep = '------\t---------\t-----\r\n';
    const envTitle = 'Environment Variable\r\n~~~~~~~~~~~~~~~~~~~~~~';
    const envHeader = 'key\tvalue\r\n';
    const envSep = '------\t-----\r\n';
    const envTable = Object.keys(envConfig).map((x) => `${x}: ${envConfig[x]}`).join('\r\n');

    log(
      'Resource Report\r\n%s%s%s%s%s%s%s%s',
      title, header, sep, table,
      envTitle, envHeader, envSep, envTable,
    );
  }

  const maxScore = Math.max(...assetScores);

  const matchedIndex = assetScores.findIndex((score) => score === maxScore);

  return resources[matchedIndex].item;
};
