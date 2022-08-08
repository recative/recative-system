import type { IEpisode } from '@recative/definitions';
import type { IInitialAssetStatus } from '@recative/core-manager';

import { NetworkRequestStatus } from '../constant/NetworkRequestStatus';

export interface IClientSdkConfig {
  pathPattern: string;
  dataType: 'bson' | 'json' | 'uson';
  episodesMap: Map<string, IEpisode>;
  initialAssetStatus: IInitialAssetStatus | undefined;
  videoModalUrls: string[];
  requestStatus: Record<string, NetworkRequestStatus>;
}
