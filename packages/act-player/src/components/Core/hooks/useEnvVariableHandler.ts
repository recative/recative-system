import * as React from 'react';

import { EpisodeCore } from '@recative/core-manager';

import type {
  IUserRelatedEnvVariable,
  IDefaultAdditionalEnvVariable,
} from '@recative/core-manager';

export const useEnvVariableHandler = <
T extends Record<string, unknown> = IDefaultAdditionalEnvVariable,
>(
    userData: IUserRelatedEnvVariable | undefined,
    envVariable: T,
    core: EpisodeCore,
  ) => {
  React.useEffect(() => {
    if (userData) {
      core.envVariableManager.userRelatedEnvVariableAtom.set(
        userData,
      );
    }
  }, [core.envVariableManager.userRelatedEnvVariableAtom, userData]);

  React.useEffect(() => {
    if (envVariable) {
      core.additionalEnvVariable.set(envVariable);
    }
  }, [core.additionalEnvVariable, envVariable]);
};
