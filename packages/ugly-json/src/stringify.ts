export const stringify = (x: unknown) => {
  const head: string[] = [];

  const getIndex = (x: string) => {
    const index = head.indexOf(x);

    if (index >= 0) {
      return index;
    }

    head.push(x);

    return head.length - 1;
  }

  const body = JSON.stringify(x, (_, value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};

      for (const i in value) {
        result[getIndex(i)] = value[i];
      }

      return result;
    }

    return getIndex(value);
  });

  return `${body}\n${JSON.stringify(head)}`;
}