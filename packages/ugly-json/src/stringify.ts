export class SearchableMap {
  private index = 0;

  private value = new Map<string, number>();

  push = (x: string) => {
    this.value.set(x, this.index);

    this.index = this.index + 1;
  }

  get length() {
    return this.index;
  }

  indexOf = (x: string) => {
    const result = this.value.get(x);

    if (result === undefined) {
      return -1;
    }

    return result;
  }

  dump = () => {
    return [...this.value.keys()]
  }
}

export const stringify = (x: unknown) => {
  const head = new SearchableMap();

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

  const sHead = JSON.stringify(head.dump());

  return `${sBody}\n${sHead}`;
}