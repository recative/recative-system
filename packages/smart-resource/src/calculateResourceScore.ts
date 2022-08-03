/**
 * Give a selector and environment variable, return the score of the selector.
 * @param selector Selector of this resource.
 * @param envConfig Environment variable of current system.
 * @param weights Weights of each environment variable entry.
 * @returns the score of the selector.
 *
 * @example
 * ```ts
 * const selector = ['lang:zh-Hans', 'category:image', 'client:web'];
 * const envConfig = {
 *   lang: 'zh-Hans',
 *   category: 'image',
 *   client: 'app',
 * };
 * const weights = {
 *   lang: 1,
 * };
 * const score = calculateResourceScore(selector, envConfig);
 * ```
 */
export const calculateResourceScore = (
  selector: Map<string, string>,
  envConfig: Record<string, string>,
  weights: Record<string, number>,
) => {
  const assetScore = Array.from(selector.entries())
    .map(([key, value]) => (envConfig[key] === value ? weights[key] || 0 : 0))
    .reduce((a, b) => a + b, 0);

  return '*' in selector ? assetScore + 0.1 : assetScore;
};
