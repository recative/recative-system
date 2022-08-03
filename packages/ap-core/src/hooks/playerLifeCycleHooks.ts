import {
  PLAY,
  PAUSE,
  SEEK,
  HIDE,
  DESTROY,
  SHOW_ACT_POINT,
  DIALOG_MESSAGE,
  DIALOG_ACTION_TRIGGERED,
  FINISHED_PAYMENT,
  VIDEO_MODAL_CLOSED,
  RESOLUTION_UPDATE,
  ACT_POINT_SHOWN,
} from '../core/protocol';
import { EventDetail } from '../core/EventTarget';

import { useEventTarget, useStore } from './baseHooks';

import { useEnvVariableUpdateCallback } from './envVariableHooks';

type LifeCycleCallback<T = null> = (x: T) => void;

/**
 * @deprecated use useEnvVariableUpdateCallback
 */
export const useEnvironmentVariableUpdateCallback = useEnvVariableUpdateCallback;

export const useSeekProgressCallback = (
  callback: LifeCycleCallback<EventDetail<typeof SEEK>>,
) => {
  const eventTarget = useEventTarget();
  return eventTarget.on(SEEK, (event) => callback(event.detail));
};

export const useHideProgressCallback = (
  callback: LifeCycleCallback<EventDetail<typeof HIDE>>,
) => {
  const eventTarget = useEventTarget();
  return eventTarget.on(HIDE, (event) => callback(event.detail));
};

export const useFinishedPaymentCallback = (
  callback: LifeCycleCallback<EventDetail<typeof FINISHED_PAYMENT>>,
) => {
  const eventTarget = useEventTarget();
  return eventTarget.on(FINISHED_PAYMENT, (event) => callback(event.detail));
};

export const useVideoModalCloseCallback = (
  callback: LifeCycleCallback<EventDetail<typeof VIDEO_MODAL_CLOSED>>,
) => {
  const eventTarget = useEventTarget();
  return eventTarget.on(VIDEO_MODAL_CLOSED, (event) => callback(event.detail));
};

export const useResolutionUpdateCallback = (
  callback: LifeCycleCallback<EventDetail<typeof RESOLUTION_UPDATE>>,
) => {
  const eventTarget = useEventTarget();
  return eventTarget.on(RESOLUTION_UPDATE, (event) => callback(event.detail));
};

export const usePlayingCallback = (
  callback: LifeCycleCallback<EventDetail<typeof PLAY>>,
) => {
  const eventTarget = useEventTarget();
  return eventTarget.on(PLAY, (event) => callback(event.detail));
};

export const usePauseCallback = (
  callback: LifeCycleCallback<EventDetail<typeof PAUSE>>,
) => {
  const eventTarget = useEventTarget();
  return eventTarget.on(PAUSE, (event) => callback(event.detail));
};

export const useShowActPointCallback = (
  callback: LifeCycleCallback<EventDetail<typeof SHOW_ACT_POINT>>,
  triggerIfAlreadyShown = true,
) => {
  const [getShown] = useStore(ACT_POINT_SHOWN);

  const eventTarget = useEventTarget();

  if (triggerIfAlreadyShown && getShown()) {
    callback(null);
  }
  return eventTarget.on(SHOW_ACT_POINT, (event) => {
    callback(event.detail);
  });
};

export const useDestroyCallback = (
  callback: LifeCycleCallback<EventDetail<typeof DESTROY>>,
) => {
  const eventTarget = useEventTarget();
  return eventTarget.on(DESTROY, (event) => callback(event.detail));
};

export const useDialogActiveCallback = (
  callback: LifeCycleCallback<EventDetail<typeof DIALOG_ACTION_TRIGGERED>>,
) => {
  const eventTarget = useEventTarget();
  return eventTarget.on(DIALOG_ACTION_TRIGGERED, (event) => callback(event.detail));
};

export const useDialogMessageCallback = (
  callback: LifeCycleCallback<EventDetail<typeof DIALOG_MESSAGE>>,
) => {
  const eventTarget = useEventTarget();
  return eventTarget.on(DIALOG_MESSAGE, (event) => callback(event.detail));
};
