import {
  createComponentContext,
  setContext,
  removeContext,
} from '../core/componentContext';
import type { IComponentContext } from '../core/componentContext';
import { EventDefinition } from '../core/EventTarget';

export interface IEmptyAppOptions {
  context?: IComponentContext
}

export const DESTROYED_EMPTY_APP = EventDefinition();

/** This function will create an app ONLY FOR DEBUG PURPOSE, and can't be connected to
 *   any type of application.
*/
export const createEmptyApp = ({
  context = createComponentContext(),
}: IEmptyAppOptions) => {
  const { eventTarget } = context;

  const destroy = () => {
    eventTarget.fire(DESTROYED_EMPTY_APP);

    eventTarget.dispose();
    context.resourceTracker.dispose();
  };

  const wrapContext = <T extends unknown[], U>(x: (...args: T) => U) => (...args: T) => {
    setContext(context);
    const result = x(...args);
    removeContext();

    return result;
  };

  let paused = false;

  const pause = () => {
    paused = true;
  };

  const play = () => {
    paused = false;
  };

  return {
    destroy,
    pause,
    play,
    wrapContext,
    context,
    get paused() {
      return paused;
    },
  };
};

export type IEmptyApp = ReturnType<typeof createEmptyApp>;
