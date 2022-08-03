export const clamp = (x: number, a: number, b: number) => {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  if (x < min) return min;
  if (x > max) return max;
  return x;
};
