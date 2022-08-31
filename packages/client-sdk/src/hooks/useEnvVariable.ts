import React from 'react';

import { useAsync } from '@react-hookz/web';

import { getDiagnosisInformation } from '../utils/getDiagnosisInformation';

import type { IRpcFunction } from '../types/IRpcFunction';
import type { IEpisodeSave } from '../types/IEpisodeSave';
import type { IDiagnosisInformation } from '../utils/getDiagnosisInformation';

export interface IEnvVariable {
  saves: IEpisodeSave[];
  episodeIdInOrder: number;
  episodeIdInDatabase: string | undefined;
  episodes: IEpisodeSave[];
  diagnosisInformation: IDiagnosisInformation;
}

export const useEnvVariable = <T>(
  episodeIdInOrder: number,
  episodeIdInDatabase: string | undefined,
  server: IRpcFunction,
  postProcess: (x: IEnvVariable) => IEnvVariable & T,
) => {
  const [episodesData, episodesDataController] = useAsync(
    server.getEpisodesForEnvVariable,
  );

  const diagnosisInformation = getDiagnosisInformation();

  React.useEffect(() => {
    episodesDataController.execute();
  }, [episodeIdInOrder, episodesDataController]);

  const beforeProcess = React.useMemo<IEnvVariable>(
    () => ({
      saves: episodesData.result || [],
      episodeIdInOrder,
      episodeIdInDatabase,
      episodeId: episodeIdInDatabase,
      episodes: episodesData.result || [],
      diagnosisInformation,
    }),
    [episodesData.result, episodeIdInOrder, episodeIdInDatabase, diagnosisInformation],
  );

  const postProcessed = React.useMemo(
    () => postProcess(beforeProcess),
    [postProcess, beforeProcess],
  );

  return postProcessed;
};
