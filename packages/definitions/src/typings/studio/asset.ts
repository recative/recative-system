import type { IActPoint } from '../meta/actPoint';
import type { IResourceItem } from '../meta/resource';

export type AssetSearchResult = (IActPoint | IResourceItem) & {
  contentExtensionId: string;
};
