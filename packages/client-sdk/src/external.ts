/**
 * This file lists dependencies that can be used for hot loaded
 * modules, to prevent circular dependencies, `Content` component
 * and `loadCustomizedModule` method, `useCustomizedModule` hook
 * are excluded.
 * Which means you can't recursively create another player, or
 * hot load another module. this is an edge case, and there's no
 * plan to support such features.
 * Please notice that:
 * * TypeScript may treat the missing part as valid variable, since
 *   it is using the definition of 'index.ts', one possible solution
 *   is to create another package for this use case.
 * * You have to manually maintain both `index.ts` and this file to
 *   make sure variables are exported correctly to package and hot
 *   loaded modules.
 */
export * from './hooks/useRemoteData';
export * from './hooks/useEnvVariable';
export * from './hooks/useEpisodeDetail';
export * from './hooks/useUserImplementedFunctions';
export { useSdkConfig, useEpisodes } from './hooks/useSdkConfig';

export * from './types/IEpisodeDetail';
export * from './types/IEpisodeSave';
export * from './types/IRpcFunction';

export * from './utils/getDiagnosisInformation';

export { fetch as fetchMetadata } from './utils/fetch';

export { PlayerSdkProvider } from './context';
