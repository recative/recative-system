export class NotLazyOpenPromiseError extends Error {
  name = 'NotLazyOpenPromiseError';

  constructor() {
    super('OpenPromise must be lazy');
  }
}
