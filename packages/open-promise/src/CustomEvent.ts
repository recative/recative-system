/**
 * Represents an event with additional data of type `T`.
 *
 * @typeparam T - The type of the additional data attached to the event.
 */
export class CustomEvent<T> extends Event {
  /**
   * Additional data attached to the event.
   */
  detail: T | undefined = undefined;

  /**
   * Creates a new instance of `CustomEvent`.
   *
   * @param type - The type of the event.
   * @param options - An object containing options to customize the event.
   *   The `detail` property of the `options` object can be used to attach
   *   additional data of type `T` to the event.
   */
  constructor(type: string, options: EventInit & { detail: T }) {
    super(type, options);
    if (options?.detail) {
      this.detail = options.detail;
    }
  }
}
