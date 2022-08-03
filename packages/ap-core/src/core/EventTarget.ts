import { v4 as uuidV4 } from 'uuid';

import PatchedEventTarget from '@ungap/event-target';

export interface CustomEventListener<T = unknown> {
  (evt: CustomEvent<T>): void;
}
type TListener<T = any> = CustomEventListener<T>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class InternalEventName<T> extends String {}

export type EventDetail<T> = T extends InternalEventName<infer X> ? X : never;
export type EventName<T> = InternalEventName<T>;

export const EventDefinition = <T = null>() => uuidV4() as InternalEventName<T>;
export class EventTarget2 {
  listeners: Map<string | InternalEventName<unknown>, Set<TListener>> = new Map();

  private target = new PatchedEventTarget();

  addEventListener<T>(
    type: string | InternalEventName<T>,
    listener: TListener<T>,
    options?: boolean | AddEventListenerOptions | undefined,
  ) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());

    const listenerSet = this.listeners.get(type)!;

    listenerSet.add(listener);
    this.target.addEventListener(
      type as string,
      listener as EventListener,
      options,
    );
  }

  removeEventListener(
    type: string | InternalEventName<unknown>,
    listener: TListener<any>,
  ) {
    const listenerSet = this.listeners.get(type)!;

    listenerSet.delete(listener);
    this.target.removeEventListener(type as string, listener as EventListener);
  }

  on<T>(
    type: string | InternalEventName<T>,
    listener: CustomEventListener<T>,
    options?: boolean | AddEventListenerOptions | undefined,
  ) {
    this.addEventListener(type, listener, options);
  }

  off = this.removeEventListener;

  fire(name: string | InternalEventName<unknown>): void;
  fire<T>(name: string | InternalEventName<T>, detail: T): void;

  fire<T>(name: string | InternalEventName<T>, detail?: T) {
    this.target.dispatchEvent(new CustomEvent<T>(name as string, { detail }));
  }

  dispatchEvent<T>(event: CustomEvent<T>) {
    this.target.dispatchEvent(event);
  }

  dispose() {
    const types = Array.from(this.listeners.keys());

    for (let i = 0; i < types.length; i += 1) {
      const type = types[i];
      const listenerSet = this.listeners.get(type)!;

      listenerSet.forEach((listener) => {
        this.removeEventListener(type as string, listener);
      });
    }
  }
}
