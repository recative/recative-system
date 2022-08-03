import { BidirectionalMap } from '../../utils';

export enum PreloadLevel {
  None = 'preload:none',
  BeforeApp = 'preload:before-app',
  AfterApp = 'preload:after-app',
  BeforeEpisode = 'preload:before-episode',
  AfterEpisode = 'preload:after-episode',
  InsideActPoint = 'preload:inside-act-point',
}

/**
 * Smaller means higher priority
 */
export const preloadPriorityLevelMap = new BidirectionalMap<PreloadLevel, number>();

let preloadPriorityLevelMapInitialized = false;

const ensurePreloadPriorityLevelMapInitialized = () => {
  if (!preloadPriorityLevelMapInitialized) {
    preloadPriorityLevelMap.set(PreloadLevel.BeforeApp, 1);
    preloadPriorityLevelMap.set(PreloadLevel.AfterApp, 2);
    preloadPriorityLevelMap.set(PreloadLevel.BeforeEpisode, 3);
    preloadPriorityLevelMap.set(PreloadLevel.AfterEpisode, 4);
    preloadPriorityLevelMap.set(PreloadLevel.InsideActPoint, 5);
    preloadPriorityLevelMap.set(PreloadLevel.None, 6);
    preloadPriorityLevelMapInitialized = true;
  }
};

export const getHighestPreloadLevel = (preloadLevels: PreloadLevel[]) => {
  ensurePreloadPriorityLevelMapInitialized();

  const highestScore = Math.min(
    ...preloadLevels.map((level) => preloadPriorityLevelMap.get(level) ?? 6),
  );

  return preloadPriorityLevelMap.get(highestScore) ?? PreloadLevel.None;
};
