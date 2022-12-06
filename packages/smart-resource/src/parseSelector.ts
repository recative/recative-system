/**
 * Parsing smart resource selector.
 * @param x The selector to parse.
 * @returns The parsed selector.
 *
 * @example
 * ```ts
 * const selector = ['lang:zh-Hans', 'category:image', 'client:web'];
 * const parsed = parse(selector);
 * ```
 */
export const parseSelector = (x: string[]) => {
  const selectors = new Map<string, string[]>();

  x.filter(Boolean)
    .map((entry) => entry.trim())
    .map((entry) => entry.split(':'))
    .filter((splitted) => splitted.length === 2)
    .map(
      (cleaned) =>
        cleaned.map((item) => item.trim()) as unknown as Readonly<
          [string, string]
        >
    )
    .forEach(([key, value]) => {
      const nextValue = selectors.get(key) ?? [];
      nextValue.push(value);
      selectors.set(key, nextValue);
    });

  return selectors;
};
