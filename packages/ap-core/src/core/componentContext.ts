import { TimeSlicingQueue } from '@recative/open-promise';

import { TimeMagic } from './TimeMagic';
import { AtomStore } from './AtomStore';
import { Stylesheet } from './Stylesheet';
import { EventTarget2 } from './EventTarget';
import { ResourceTracker } from './ResourceTracker';
import { RemoteStoreRegistry } from './RemoteStoreRegistry';

export interface IComponentContext {
  stylesheet: Stylesheet;
  eventTarget: EventTarget2;
  resourceTracker: ResourceTracker;
  ticker: TimeMagic;
  store: AtomStore;
  remoteStoreRegistry: RemoteStoreRegistry;
  taskQueue: TimeSlicingQueue;
  parent: IComponentContext | null;
  wrap: <T extends unknown[], U>(x: (...args: T) => U) => (...args: T) => U;
}

let currentContext: IComponentContext | null = null;

export const setContext = (context: IComponentContext) => {
  currentContext = context;
};

export const removeContext = () => {
  currentContext = null;
};

export const getContext = () => currentContext;

export const createComponentContext = (
  parent: IComponentContext | null = null
) => {
  const eventTarget = new EventTarget2();

  const result: IComponentContext = {
    eventTarget,
    stylesheet: new Stylesheet(eventTarget),
    resourceTracker: new ResourceTracker(),
    ticker: new TimeMagic(),
    store: new AtomStore(),
    remoteStoreRegistry: new RemoteStoreRegistry(),
    taskQueue: new TimeSlicingQueue(),
    wrap:
      <T extends unknown[], U>(x: (...args: T) => U) =>
      (...args: T) => {
        const oldContext = getContext();
        setContext(result);
        const fnResult = x(...args);
        if (oldContext !== null) {
          setContext(oldContext);
        } else {
          removeContext();
        }

        return fnResult;
      },
    parent,
  };

  return result;
};
