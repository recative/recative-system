import type {
  IEpisode,
  AssetForClient,
  IDetailedResourceItemForClient,
} from '@recative/definitions';

export interface IEpisodeDetail {
  key: string;
  episode: IEpisode;
  assets: AssetForClient[];
  resources: IDetailedResourceItemForClient[];
}
