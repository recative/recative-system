import React from 'react';
import debug from 'debug';

import { useAsync } from '@react-hookz/web';

import {
  LoadingLayer,
  Stage,
  Subtitle,
  Dialog,
  PanicLayer,
  Controller,
} from '@recative/act-player';

import { loadCustomizedModule } from '../utils/loadCustomizedModule';

const log = debug('client:ui-components');

/**
 * Get pathname of the URL, from `https://github.com/browserify/path-browserify/blob/master/index.js`
 * @param path The path
 * @returns The dirname
 */
export const dirname = (path: string) => {
  if (path.length === 0) return '.';
  let code = path.charCodeAt(0);
  const hasRoot = code === 47;
  let end = -1;
  let matchedSlash = true;
  for (let i = path.length - 1; i >= 1; i = i - 1) {
    code = path.charCodeAt(i);
    if (code === 47 /* / */) {
      if (!matchedSlash) {
        end = i;
        break;
      }
    } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) return '//';
  return path.slice(0, end);
};

export const DEFAULT_INTERFACE_COMPONENTS_MODULE = {
  default: [LoadingLayer, Stage, Subtitle, Dialog, Controller({}), PanicLayer],
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
  const loadComponents = React.useCallback(async () => {
    if (!baseUrl) return null;

    try {
      const module = await loadCustomizedModule(scriptName, dirname(baseUrl));
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
