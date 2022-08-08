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

  const sBody = JSON.stringify(x, (_, value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};

      const keys = Object.keys(value);
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        result[getIndex(key)] = value[key];
      }

      return result;
    }

    return getIndex(value);
  });

  const sHead = JSON.stringify(head);

  return `${sBody}\n${sHead}`;
}