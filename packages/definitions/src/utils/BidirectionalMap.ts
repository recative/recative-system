/* eslint-disable no-restricted-syntax */
export class BidirectionalMap<T, P> {
  private directionA: Map<T, P>;

  private directionB: Map<P, T>;

  constructor() {
    this.directionA = new Map();
    this.directionB = new Map();
  }

  set(A: T, B: P) {
    this.directionA.set(A, B);
    this.directionB.set(B, A);
  }

  get<Q extends T | P>(x: Q): (Q extends T ? P : T) | undefined {
    if (this.directionA.has(x as unknown as T)) {
      // @ts-ignore
      return this.directionA.get(x as T);
    }
    // @ts-ignore
    return this.directionB.get(x as P);
  }

  has(x: T | P) {
    return this.directionA.has(x as T) || this.directionB.has(x as P);
  }

  delete(x: T | P) {
    if (this.directionA.has(x as T)) {
      const target = this.directionA.get(x as T);
      if (target) {
        this.directionB.delete(target);
      }
      this.directionA.delete(x as T);
    } else {
      const target = this.directionB.get(x as P);
      if (target) {
        this.directionA.delete(target);
      }
      this.directionB.delete(x as P);
    }
  }

  clear() {
    this.directionA.clear();
    this.directionB.clear();
  }

  get size() {
    return this.directionA.size;
  }

  * [Symbol.iterator]() {
    for (const [A, B] of this.directionA) {
      yield [A, B];
    }
  }

  * entries() {
    for (const [A, B] of this.directionA) {
      yield [A, B];
    }
  }

  * valuesA() {
    for (const A of this.directionA.keys()) {
      yield A;
    }
  }

  * valuesB() {
    for (const B of this.directionB.keys()) {
      yield B;
    }
  }
}
