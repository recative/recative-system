import type { IEpisodeSave } from './IEpisodeSave';

export interface IRpcFunction {
  getArchivedData: (slotId: string) => Promise<{ data: string }>;
  getEpisodesForEnvVariable: () => Promise<IEpisodeSave[]>;
  getUnlockedEpisodes: () => Promise<string[]>;
  setEpisodeUnlocked: (episodeId: string) => Promise<void>;
  markAssetFinished: (assetId: string) => Promise<void>;
  updateArchivedData: (slotId: string, value: string) => Promise<void>;
  unlockEpisode: (episodeId: string) => Promise<void>;
  enableFullScreen?: () => Promise<void>;
  disableFullScreen?: () => Promise<void>;
}
