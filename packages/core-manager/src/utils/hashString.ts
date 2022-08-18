export const hashString = (x: string) => {
  let hash = 0;
  let i;
  let chr;

  if (x.length === 0) return hash;

  for (i = 0; i < x.length; i += 1) {
    chr = x.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }

  return hash;
};
