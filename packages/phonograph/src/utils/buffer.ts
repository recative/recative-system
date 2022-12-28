export function slice(view: Uint8Array, start: number, end: number) {
  if (view.slice) {
    return view.slice(start, end);
  }

  const clone = new Uint8Array(end - start);
  let p = 0;

  for (let i = start; i < end; i += 1) {
    // eslint-disable-next-line no-plusplus
    clone[p++] = view[i];
  }

  return clone;
}
