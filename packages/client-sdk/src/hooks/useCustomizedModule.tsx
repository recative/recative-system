import React from 'react';
import debug from 'debug';

import { useAsync } from '@react-hookz/web';

import {
  Stage,
  Dialog,
  Subtitle,
  PanicLayer,
  Controller,
  LoadingLayer,
} from '@recative/act-player';
import type { InterfaceExtensionComponent } from '@recative/act-player';

import { loadCustomizedModule } from '../utils/loadCustomizedModule';
import { useSdkConfig } from './useSdkConfig';

const log = debug('client:ui-components');

export const DEFAULT_INTERFACE_COMPONENTS_MODULE = {
  default: [
    LoadingLayer,
    Stage,
    Subtitle,
    Dialog,
    Controller({}),
    PanicLayer
  ] as InterfaceExtensionComponent[],
};

export interface ICustomizedModule<T = any> {
  default: T;
}

export const DEFAULT_COMPONENTS: React.FC = ({ children }) => (
  <div>{children}</div>
);

export const DEFAULT_MODULE: ICustomizedModule = {
  default: DEFAULT_COMPONENTS,
};

export const useCustomizedModule = <T extends ICustomizedModule<P>, P = any>(
  scriptName: string,
  baseUrl: string | null,
  defaultModule = DEFAULT_MODULE as unknown as T,
) => {
  const { pathPattern } = useSdkConfig();
  const loadComponents = React.useCallback(async () => {
    if (baseUrl === null) return null;

    try {
      const module = await loadCustomizedModule(scriptName, pathPattern, baseUrl);
      if ('default' in module) {
        log('Got imported components');
        return module as T;
      }

      const availableKeys = Object.keys(module)
        .map((x) => `* ${x}`)
        .join('\r\n');

      log(
        `\`default\` is not in the \`interfaceComponent\`, would not use imported components, available keys are: \r\n ${availableKeys}`,
      );
      return defaultModule;
    } catch (e) {
      log('something wrong happens, would not use imported components', e);
      return defaultModule;
    }
  }, [baseUrl]);

  const [components, componentActions] = useAsync(loadComponents, null);

  return [components.result, componentActions.execute] as const;
};
