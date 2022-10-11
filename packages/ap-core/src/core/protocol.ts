import type {
  ContentFunctions,
  DialogActionTriggerResponse,
} from '@recative/act-protocol';
import { OpenPromise } from '@recative/open-promise';

import { logProtocol } from '../utils/log';

import { EventDefinition } from './EventTarget';
import { AtomDefinition, FunctionalAtomDefinition } from './AtomStore';
import type { IComponentContext } from './componentContext';

export interface IEpisode {
  idInOrder: number;
  idInDatabase: number;
  author: string;
  title: string;
}

export interface ISave {
  idInOrder: number;
  idInDatabase: number;
  unlocked: boolean;
  finished: boolean;
}

export interface IEnvVariable {
  token: string;
  avatar: string;
  userName: string;
  purchasedFull: boolean;
  purchasedTry: boolean;
  episodes: IEpisode[];
  saves: ISave[];
  appLayout: boolean;
  isMobile: boolean;
  isTouchScreen: boolean;
  deviceType: 'Windows Phone' | 'Android' | 'iOS' | 'unknown';
  __smartResourceConfig: Record<string, string>;
}

export interface ISeekEventDetail {
  time: number;
}

export interface IResolutionUpdateEventDetail {
  x: number;
  y: number;
}

export interface IFinishedPaymentEventDetail {
  type: string;
}

export interface IClosedVideoModalEventDetail {
  id: string;
}

export interface ISequenceEndedEventDetail {
  id: string;
}

export interface IUpdateTextFieldEventDetail {
  textFieldId: string;
  text: string;
}

export interface IDialogMessageEventDetail {
  text: string;
}

export interface IVideoModalClosedEventDetail {
  url: string;
}

export const PLAY = EventDefinition();
export const HIDE = EventDefinition();
export const PAUSE = EventDefinition();
export const SEEK = EventDefinition<ISeekEventDetail>();
export const DESTROY = EventDefinition();
export const SHOW_ACT_POINT = EventDefinition();
export const PRELOAD_ACT_POINT = EventDefinition();
export const DIALOG_AREA_OPENED = EventDefinition();
export const DIALOG_AREA_CLOSED = EventDefinition();
export const DIALOG_MESSAGE = EventDefinition<IDialogMessageEventDetail>();
export const DIALOG_ACTION_TRIGGERED = EventDefinition<DialogActionTriggerResponse>();
export const ENV_VARIABLE_UPDATE = EventDefinition<IEnvVariable>();
export const FINISHED_PAYMENT = EventDefinition<IFinishedPaymentEventDetail>();
export const VIDEO_MODAL_CLOSED = EventDefinition<IVideoModalClosedEventDetail>();
export const RESOLUTION_UPDATE = EventDefinition<IResolutionUpdateEventDetail>();
export const TEXT_FIELD_UPDATE = EventDefinition<IUpdateTextFieldEventDetail>();
export const SEQUENCE_ENDED = EventDefinition<ISequenceEndedEventDetail>();

export const ACT_POINT_SHOWN = AtomDefinition(false);
export const ACT_POINT_PLAYING = AtomDefinition(false);
export const ENV_VARIABLE_STORE = FunctionalAtomDefinition<null | IEnvVariable>(
  () => null,
);
export const INITIALIZE_TASK_STORE = FunctionalAtomDefinition(
  () => new Map<string, OpenPromise<void>>(),
);

export const connectToHost = (context: IComponentContext) => {
  const contentFunctions: ContentFunctions = new Proxy(
    {
      requestHeartbeat() { },
      // preload() {
      //   context.eventTarget.fire(PRELOAD_ACT_POINT);
      // },
      show() {
        logProtocol('Showing the act point');
        context.store.register(ACT_POINT_SHOWN);
        context.store.setValue(ACT_POINT_SHOWN, true);
        context.store.register(ACT_POINT_PLAYING);
        if (context.store.getValue(ACT_POINT_PLAYING)) {
          context.ticker.replay();
        }
        context.eventTarget.fire(SHOW_ACT_POINT);
      },
      hide() {
        context.eventTarget.fire(HIDE);
      },
      destroy() {
        context.eventTarget.fire(DESTROY);
      },
      play() {
        context.store.register(ACT_POINT_PLAYING);
        context.store.setValue(ACT_POINT_PLAYING, true);
        context.ticker.replay();
        context.eventTarget.fire(PLAY);
      },
      pause() {
        context.store.register(ACT_POINT_PLAYING);
        context.store.setValue(ACT_POINT_PLAYING, false);
        context.ticker.pause();
        context.eventTarget.fire(PAUSE);
      },
      seek(time: number) {
        context.eventTarget.fire(SEEK, { time });
      },
      dialogAreaOpened() {
        context.eventTarget.fire(DIALOG_AREA_OPENED);
      },
      dialogAreaClosed() {
        context.eventTarget.fire(DIALOG_AREA_CLOSED);
      },
      dialogMessage(text: string) {
        context.eventTarget.fire(DIALOG_MESSAGE, { text });
      },
      dialogActionTriggered(action) {
        context.eventTarget.fire(DIALOG_ACTION_TRIGGERED, action);
      },
      updateTextField(textFieldId, text) {
        context.eventTarget.fire(TEXT_FIELD_UPDATE, { textFieldId, text });
      },
      updateEnvironment(env) {
        context.store.register(ENV_VARIABLE_STORE);
        context.store.setValue(
          ENV_VARIABLE_STORE,
          env as unknown as IEnvVariable,
        );
        context.eventTarget.fire(
          ENV_VARIABLE_UPDATE,
          env as unknown as IEnvVariable,
        );
      },
      updateResolution(x: number, y: number) {
        context.eventTarget.fire(RESOLUTION_UPDATE, { x, y });
      },
      finishPayment(type: string) {
        context.eventTarget.fire(FINISHED_PAYMENT, { type });
      },
      videoModalClosed() { },
      async runQueuedTask(taskId: string) {
        const initializeTasks = context.store.getValue(INITIALIZE_TASK_STORE);
        const initializeTask = initializeTasks.get(taskId);

        if (!initializeTask) {
          logProtocol(`[${taskId}] Initialize task not found`);
          return Promise.resolve();
        }

        logProtocol(`[${taskId}] Initialize kicked`);
        initializeTask.execute();
        return initializeTask.promise;
      },
      sequenceEnded(id) {
        context.eventTarget.fire(SEQUENCE_ENDED, { id });
      },
    },
    {
      get(target, prop: keyof ContentFunctions) {
        logProtocol(`Client function accessed: %c${prop}`, 'color: #64DD17');
        return target[prop];
      },
    },
  );

  return contentFunctions;
};
