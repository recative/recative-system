/**
 * Custom error class for when an OpenPromise is not lazy.
 */
export class NotLazyOpenPromiseError extends Error {
  /**
   * The name of the error class.
   */
  name = 'NotLazyOpenPromiseError';

  /**
   * Creates a new instance of the error with a custom message.
   */
  constructor() {
    super('OpenPromise must be lazy');
  }
}
