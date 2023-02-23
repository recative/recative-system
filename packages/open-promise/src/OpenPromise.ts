/**
 * Represents the state of an OpenPromise instance.
 */
export enum OpenPromiseState {
  Idle = 'idle',
  Pending = 'pending',
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

/**
 * An implementation of a Promise that allows the executor function to be
 * executed lazily and provides access to the resolve and reject functions.
 *
 * @typeparam T The type of the resolved value of the promise.
 */
export class PromiseResolvedError extends Error {
  name = 'PromiseResolvedError';

  constructor() {
    super('Promise already resolved / rejected');
  }
}

export class PromiseExecutedError extends Error {
  name = 'PromiseExecutedError';

  constructor() {
    super('Promise already executed, cannot be executed again');
  }
}

/**
 * A type that defines the `resolve` function for a Promise instance.
 */
type Resolve<T> = (value: T | PromiseLike<T>) => void;
/**
 * A type that defines the `reject` function for a Promise instance.
 */
type Reject = (reason: Error) => void;
/**
 * A type that defines the executor function for a Promise instance.
 */
type PromiseExecutor<T> = (resolve: Resolve<T>, reject: Reject) => void;

export class OpenPromise<T> implements Promise<T> {
  private _resolve: Resolve<T> | null = null;

  private _reject: Reject | null = null;

  resolvedValue: T | null = null;

  /**
   * The rejected reason of the promise. Set to null until the promise has been
   * rejected.
   */
  rejectedReason: Error | null = null;

  /**
   * The current state of the promise.
   */
  state: OpenPromiseState = OpenPromiseState.Idle;

  /**
   * The underlying promise instance.
   */
  readonly promise: Promise<T>;

  /**
   * Attaches callbacks for the resolution and/or rejection of the Promise.
   *
   * @param onFulfilled The callback to execute when the Promise is resolved.
   * @param onRejected The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of which ever callback is executed.
   */
  readonly then: Promise<T>['then'];

  /**
   * Attaches a callback for only the rejection of the Promise.
   *
   * @param onRejected The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  readonly catch: Promise<T>['catch'];

  /**
   * Attaches a callback for the resolution and/or rejection of the Promise.
   * The callback is executed when the Promise is settled, whether fulfilled or
   * rejected.
   *
   * @param onFinally The callback to execute when the Promise is settled.
   * @returns A Promise for the completion of the callback.
   */
  readonly finally: Promise<T>['finally'];

  /**
   * A string representing the object type. In this case, it is set to
   * `'OpenPromise'`.
   */
  readonly [Symbol.toStringTag]: string = 'OpenPromise';

  /**
   * Creates a new OpenPromise instance.
   *
   * @param executor An optional function to be executed immediately upon
   *   construction.
   * @param lazy Whether or not to delay execution until the `execute()` method
   *   is called.
   */
  constructor(
    readonly executor: PromiseExecutor<T> | null = null,
    readonly lazy = false
  ) {
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;

      if (!lazy && executor) {
        this.execute();
      }
    });

    this.then = this.promise.then.bind(this.promise);
    this.catch = this.promise.catch.bind(this.promise);
    this.finally = this.promise.finally.bind(this.promise);
  }

  /**
   * Executes the Promise if it has not already been executed.
   */
  execute = () => {
    if (this.state !== OpenPromiseState.Idle) {
      throw new PromiseExecutedError();
    }

    if (!this.executor) {
      throw new TypeError('Executor must be defined to execute this task');
    }

    this.state = OpenPromiseState.Pending;
    this.executor?.(this.resolve, this.reject);
  };

  /**
   * Resolves the Promise with the given value.
   *
   * @param value The value with which to resolve the Promise.
   */
  resolve = (value: T | PromiseLike<T>) => {
    if (
      this.state !== OpenPromiseState.Pending &&
      this.state !== OpenPromiseState.Idle
    ) {
      throw new PromiseResolvedError();
    }

    this.state = OpenPromiseState.Fulfilled;

    Promise.resolve(value).then((resolvedValue) => {
      this.resolvedValue = resolvedValue;
    });

    this._resolve!(value);
  };

  /**
   * A function that is used to reject the promise with a reason.
   *
   * @param reason The reason why the promise was rejected.
   */
  reject = (reason: Error) => {
    if (
      this.state !== OpenPromiseState.Pending &&
      this.state !== OpenPromiseState.Idle
    ) {
      throw new PromiseResolvedError();
    }

    this.state = OpenPromiseState.Rejected;

    this.rejectedReason = reason;

    this._reject!(reason);
  };
}
