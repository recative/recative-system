export class CustomEvent<T> extends Event {
  detail: T | undefined = undefined;

  constructor(type: string, options: EventInit & { detail: T }) {
    super(type, options);
    if (options?.detail) {
      this.detail = options.detail;
    }
  }
} 