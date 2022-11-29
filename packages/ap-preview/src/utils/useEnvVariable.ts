/* eslint-disable import/no-extraneous-dependencies */
import * as React from 'react';

import { useAsync } from '@react-hookz/web';
import { useParams } from 'react-router-dom';

const DEFAULT_ENV_VARIABLE = {};

export const useEnvVariable = (): Record<string, unknown> => {
  const { episodeId } = useParams<{ episodeId: string }>();

  const fetchData = React.useCallback(async () => {
    if (!episodeId) return { assets: [], resources: [] };

    const envSearchParameter = new URLSearchParams(window.location.search);
    envSearchParameter.set('episodeId', episodeId);

    try {
      const response2 = await fetch(
        `${window.location.protocol}//${
          window.location.hostname
        }:9999/envVariable?${envSearchParameter.toString()}`,
      );

      const envVariable = await response2.json();

      return {
        ...envVariable,
      };
    } catch (e) {
      alert('Unable to connect to act studio.');
      console.error(e);
    }
  }, [episodeId]);

  const [envVariable, envVariableActions] = useAsync(fetchData);

  React.useEffect(() => {
    envVariableActions.execute();
  }, [envVariableActions, episodeId]);

  return (envVariable.result as Record<string, unknown>) || DEFAULT_ENV_VARIABLE;
};
