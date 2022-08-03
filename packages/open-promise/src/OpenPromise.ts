export enum OpenPromiseState {
  Idle = 'idle',
  Pending = 'pending',
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

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

type Resolve<T> = (value: T | PromiseLike<T>) => void;
type Reject = (reason: Error) => void;

type PromiseExecutor<T> = (resolve: Resolve<T>, reject: Reject) => void;

export class OpenPromise<T> implements Promise<T> {
  private _resolve: Resolve<T> | null = null;

  private _reject: Reject | null = null;

  resolvedValue: T | null = null;

  rejectedReason: Error | null = null;

  state: OpenPromiseState = OpenPromiseState.Idle;

  readonly promise: Promise<T>;

  readonly then: Promise<T>['then'];

  readonly catch: Promise<T>['catch'];

  readonly finally: Promise<T>['finally'];

  readonly [Symbol.toStringTag]: string = 'OpenPromise';

  constructor(
    readonly executor: PromiseExecutor<T> | null = null,
    readonly lazy = false,
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

  resolve = (value: T | PromiseLike<T>) => {
    if (
      this.state !== OpenPromiseState.Pending
      && this.state !== OpenPromiseState.Idle
    ) {
      throw new PromiseResolvedError();
    }

    this.state = OpenPromiseState.Fulfilled;

    Promise.resolve(value).then((resolvedValue) => {
      this.resolvedValue = resolvedValue;
    });

    this._resolve!(value);
  };

  reject = (reason: Error) => {
    if (
      this.state !== OpenPromiseState.Pending
      && this.state !== OpenPromiseState.Idle
    ) {
      throw new PromiseResolvedError();
    }

    this.state = OpenPromiseState.Rejected;

    this.rejectedReason = reason;

    this._reject!(reason);
  };
}
