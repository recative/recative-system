import { EventTarget2, EventDefinition } from './EventTarget';
import type { EventName } from './EventTarget';

import type { Subscriber } from '../types/dataSource';

export interface PureAtomName<T> {
  initialValue: T;
}
export interface FunctionAtomName<T> {
  initializeFunction: () => T;
}
export type AtomName<T> = PureAtomName<T> | FunctionAtomName<T>;

// eslint-disable-next-line max-len
export const AtomDefinition = <T = null>(initialValue: T) => Object.freeze({ initialValue }) as PureAtomName<T>;

export const FunctionalAtomDefinition = <T = null>(
  initializeFunction: () => T,
) => Object.freeze({ initializeFunction }) as FunctionAtomName<T>;

type SubscriberWrap<T> = (x: CustomEvent<T>) => void;

class NotRegisteredError extends Error {
  name = 'NotRegistered';

  constructor() {
    super('Could not find store with given name.');
  }
}

export class AtomStore {
  private readonly store: Map<AtomName<unknown>, unknown> = new Map();

  private readonly eventNameTable: Map<AtomName<unknown>, EventName<unknown>> = new Map();

  private readonly subscriberTable: Map<
  AtomName<unknown>,
  Set<SubscriberWrap<unknown>>
  > = new Map();

  private readonly SubScribeToWrapMap: WeakMap<
  Subscriber<any>,
  SubscriberWrap<any>
  > = new WeakMap();

  private readonly eventTarget: EventTarget2 = new EventTarget2();

  getSubScribersAndEventName<T>(name: AtomName<T>) {
    const subscribers = this.subscriberTable.get(name);
    const eventName = this.eventNameTable.get(name);

    if (!subscribers || !eventName) {
      throw new NotRegisteredError();
    }

    return {
      subscribers: subscribers as Set<SubscriberWrap<T>>,
      eventName: eventName as EventName<T>,
    };
  }

  register<T>(name: AtomName<T>) {
    if (this.store.has(name)) {
      return;
    }

    if ('initializeFunction' in name) {
      this.store.set(name, name.initializeFunction());
    } else {
      this.store.set(name, name.initialValue);
    }
    this.eventNameTable.set(name, EventDefinition());
    this.subscriberTable.set(name, new Set());
  }

  deregister<T>(name: AtomName<T>) {
    this.store.delete(name);

    const { subscribers, eventName } = this.getSubScribersAndEventName(name);

    subscribers.forEach((subscriber) => {
      this.eventTarget.off(eventName, subscriber);
    });

    this.subscriberTable.delete(name);
  }

  subscribe<T>(name: AtomName<T>, fn: Subscriber<T>) {
    const { subscribers, eventName } = this.getSubScribersAndEventName(name);

    const listener: SubscriberWrap<T> = (x: CustomEvent<T>) => {
      fn(x.detail);
    };

    (subscribers as Set<SubscriberWrap<T>>).add(listener);

    this.eventTarget.on(eventName, listener);
    this.SubScribeToWrapMap.set(fn, listener);

    return () => this.unsubscribe(name, fn);
  }

  unsubscribe<T>(name: AtomName<T>, fn: Subscriber<T>) {
    const { subscribers, eventName } = this.getSubScribersAndEventName(name);

    const listener = this.SubScribeToWrapMap.get(fn);
    if (listener) {
      this.SubScribeToWrapMap.delete(listener);
      this.eventTarget.off(eventName, listener);
      subscribers.delete(listener);
    }
  }

  getValue<T>(name: AtomName<T>) {
    return this.store.get(name) as T;
  }

  setValue<T>(name: AtomName<T>, value: T) {
    this.store.set(name, value);

    const { eventName } = this.getSubScribersAndEventName(name);

    this.eventTarget.fire(eventName, value);
  }

  dispose() {
    this.eventTarget.dispose();
    this.store.clear();
    this.eventNameTable.clear();
    this.subscriberTable.clear();
  }
}
