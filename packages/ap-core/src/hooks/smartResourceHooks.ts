import debug from 'debug';

import { getMatchedResource } from '@recative/smart-resource';
import type { ResourceEntry } from '@recative/smart-resource';

import { useSelector } from '../core/DataSource';
import { useEnvVariableDataSource } from './envVariableHooks';

const EMPTY_OBJECT = {};

const log = debug('ap-core:smart-resource-hook');

export const useSmartResourceDataSource = (config: ResourceEntry<string>[]) => {
  const envVariableDataSource = useEnvVariableDataSource();

  return useSelector(envVariableDataSource, (data) => {
    const smartResourceConfig = data?.__smartResourceConfig;

    log('WARNING: envVariable not available, will use empty one instead, config:', config);

    return getMatchedResource(
      config,
      smartResourceConfig ?? EMPTY_OBJECT,
    );
  });
};
