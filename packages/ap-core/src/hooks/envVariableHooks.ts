import { useStore } from './baseHooks';

import { ENV_VARIABLE_STORE } from '../core/protocol';
import type { IEnvVariable } from '../core/protocol';

export const useEnvVariableDataSource = () => {
  const [, , subscribeEnvVariableUpdate] = useStore(ENV_VARIABLE_STORE);

  return subscribeEnvVariableUpdate;
};

export const useEnvVariableUpdateCallback = (
  subscriber: (data: IEnvVariable) => void,
) => {
  const onEnvVariableUpdate = useEnvVariableDataSource();

  const { getter } = onEnvVariableUpdate((data) => {
    subscriber(data!);
  });
  const data = getter();
  if (data !== null) {
    subscriber(data);
  }
};
