export const parseBase10 = (x: string) => {
  return Number.parseFloat(x);
};

export const add = (a: number, b: number) => {
  return a + b;
};

export const sub = (a: number, b: number) => {
  return a - b;
};

export const mean = (x: number[]) => {
  return x.reduce(add, 0) / x.length;
};

export const median = (values: number[]) => {
  values.sort(sub);
  const half = Math.floor(values.length / 2);
  return values.length % 2
    ? values[half]
    : (values[half - 1] + values[half]) / 2.0;
};

export const standardDeviation = (values: number[]) => {
  const avg = mean(values);
  const squareDiffs = values.map((value) => {
    const diff = value - avg;
    const sqrDiff = diff * diff;
    return sqrDiff;
  });

  const avgSquareDiff = mean(squareDiffs);

  const stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
};
