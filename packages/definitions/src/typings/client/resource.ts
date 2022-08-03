import type { IResourceFile, IResourceGroup } from '../meta/resource';
import type { ResourceFileKeysForClient, ResourceGroupKeysForClient } from '../../constants/client/resource';

export type IResourceFileForClient = Pick<IResourceFile, ResourceFileKeysForClient>;

export type IResourceGroupForClient = Pick<IResourceGroup, ResourceGroupKeysForClient>;

export type IDetailedResourceGroupForClient = Omit<
IResourceGroupForClient,
'files'
> & { files: IResourceFileForClient[] };

export type IResourceItemForClient =
  | IResourceFileForClient
  | IResourceGroupForClient;

export type IDetailedResourceItemForClient =
  | IResourceFileForClient
  | IDetailedResourceGroupForClient;
