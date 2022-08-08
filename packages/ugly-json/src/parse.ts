export const parse = <T>(x: string): T => {
    const [ sBody, sHead ] = x.split('\n');

    if (!sBody || !sHead) {
        throw new TypeError('Invalid input');
    }

    const head = JSON.parse(sHead);

    return JSON.parse(sBody, (_, value) => {
      if (Array.isArray(value)) {
        return value;
      }

      if (value !== null && typeof value === 'object') {
        const result: Record<string, unknown> = {};

        for (const i in value) {
          result[head[i]] = value[i];
        }

        return result;
      }

      return head[value];
    }) as T;
  }
  