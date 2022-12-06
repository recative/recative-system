/* eslint-disable @typescript-eslint/no-explicit-any */
import EventTarget from '@ungap/event-target';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export declare class EventName<T> extends String {}

export const createEventName = <T>(value = Math.random().toString(36)) => {
  return value as EventName<T>;
};

export class Event<EventDetail> extends CustomEvent<EventDetail> {
  constructor(eventName: EventName<EventDetail>, eventDetail: EventDetail) {
    super(eventName as string, { detail: eventDetail });
  }
}

export type EventDetail<T> = T extends EventName<infer U> ? U : never;

type Listener<T extends EventName<any>> = (x: Event<EventDetail<T>>) => void;

export class Target<Events extends EventName<any>[]> {
  private eventListener = new EventTarget();

  addEventListener = <T extends Events[number]>(
    type: T,
    listener: Listener<T>,
    options?: boolean | AddEventListenerOptions
  ) => {
    return this.eventListener.addEventListener(
      type as unknown as string,
      listener as EventListener,
      options
    );
  };

  dispatchEvent = <T extends Events[number]>(event: Event<EventDetail<T>>) => {
    return this.eventListener.dispatchEvent(event);
  };

  removeEventListener = <T extends Events[number]>(
    type: EventName<T>,
    callback: Listener<T>,
    options?: EventListenerOptions | boolean
  ) => {
    return this.eventListener.removeEventListener(
      type as string,
      callback as EventListener,
      options
    );
  };

  on = this.addEventListener;

  off = this.removeEventListener;

  fire = this.dispatchEvent;
}
