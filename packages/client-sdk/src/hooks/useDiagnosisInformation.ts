import * as React from 'react';

import { useAsync } from '@react-hookz/web';

import { getDiagnosisInformation } from '../external';

export const useDiagnosisInformation = () => {
  const [result, resultActions] = useAsync(getDiagnosisInformation);

  React.useEffect(() => {
    resultActions.execute();
  }, [resultActions]);

  return result.result;
}
