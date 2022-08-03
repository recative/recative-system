import { isString } from 'lodash';
import { v4 as uuidV4 } from 'uuid';

import { DialogDirection } from '@recative/act-protocol';
import type {
  ImageDialogMessage,
  TextDialogMessage,
} from '@recative/act-protocol';

import { DIALOG_ACTION_TRIGGERED } from '../core/protocol';

import { useEventTarget } from './baseHooks';
import { useHostFunctions } from './hostFunctionsHooks';

export interface IOptionItem {
  id: string;
  label: string;
}

export interface ISayButton {
  id: string;
  label: string;
}

type OptionCallback = () => void;

interface ISayOptions {
  type: 'options';
  columns?: number;
  options: Record<string, OptionCallback>;
}

const wait = (x: number) => new Promise((res) => {
  window.setTimeout(() => res(0), x);
});

export const SayImage = (src: string): ImageDialogMessage => ({
  type: 'image',
  direction: DialogDirection.Right,
  src,
});

export const SayOptions = (
  options: Record<string, OptionCallback>,
  columns: number,
): ISayOptions => ({
  type: 'options',
  columns,
  options,
});

export const useDialog = (
  x: (string | ISayOptions | ImageDialogMessage | TextDialogMessage)[],
  once: boolean = false,
) => {
  const { connector } = useHostFunctions();
  const eventTarget = useEventTarget();

  const buttonNameToHashMap: Record<string, string> = {};
  const buttonHashToCallbackMap: Record<string, OptionCallback> = {};

  let executed = false;
  let lastActionId: string | null = null;

  eventTarget.on(DIALOG_ACTION_TRIGGERED, (event) => {
    const buttonId = event.detail.action.id;
    const callback = buttonHashToCallbackMap[buttonId];

    if (!callback) return;

    callback();
  });

  const startBBManyManyWords = async () => {
    if (executed && once) return;
    executed = true;
    connector.showDialogArea();

    for (let i = 0; i < x.length; i += 1) {
      const action = x[i];

      if (!isString(action) && action.type === 'options') {
        const options: IOptionItem[] = [];
        lastActionId = uuidV4();

        Object.keys(action.options).forEach((text) => {
          const callback = action.options[text];
          if (!callback) return;

          const hash = uuidV4();
          buttonNameToHashMap[text] = hash;
          buttonHashToCallbackMap[hash] = callback;

          options.push({
            id: hash,
            label: text,
          });
        });

        connector.setDialogActions({
          id: lastActionId,
          column: action.columns || 1,
          actions: options,
        });
      } else {
        const _action = isString(action)
          ? ({
            type: 'text',
            direction: DialogDirection.Right,
            content: action,
          } as const)
          : action;

        const waitTime = _action.type === 'text' ? _action.content.length * 120 : 500;

        await wait(100);
        connector.sendDialogMessage([_action]);

        await wait(waitTime);
      }
    }
  };

  return startBBManyManyWords;
};
