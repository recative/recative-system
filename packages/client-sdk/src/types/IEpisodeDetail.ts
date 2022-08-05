import type {
  IEpisode,
  AssetForClient,
  IResourceItemForClient,
} from '@recative/definitions';

export interface IEpisodeAbstraction {
  key: string;
  episode: IEpisode;
  assets: AssetForClient[];
}

export interface IEpisodeDetail {
  key: string;
  episode: IEpisode;
  assets: AssetForClient[];
  resources: IResourceItemForClient[];
}
