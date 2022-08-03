import { pick } from './pick';

import {
  IResourceItem,
  IResourceFile,
  IResourceGroup,
} from '../typings/meta/resource';
import {
  IResourceItemForClient,
  IResourceFileForClient,
  IResourceGroupForClient,
  IDetailedResourceItemForClient,
  IDetailedResourceGroupForClient,
} from '../typings/client/resource';

type ResourceFileTypeCast<T> = T extends IResourceItem
  ? IResourceFile
  : IResourceFileForClient;
type ResourceGroupTypeCast<T> = T extends IResourceItem
  ? IResourceGroup
  : IResourceGroupForClient;

export class ResourceList<
  T extends
  | IResourceItem
  | IResourceItemForClient
  | IDetailedResourceItemForClient,
> {
  readonly items: Set<T> = new Set();

  readonly resourceFiles: Set<ResourceFileTypeCast<T>> = new Set();

  readonly resourceGroups: Set<ResourceGroupTypeCast<T>> = new Set();

  readonly itemsById: Map<string, T> = new Map();

  readonly itemsByLabel: Map<string, T> = new Map();

  readonly filesById: Map<string, ResourceFileTypeCast<T>> = new Map();

  readonly filesByLabel: Map<string, ResourceFileTypeCast<T>> = new Map();

  readonly groupsById: Map<string, ResourceGroupTypeCast<T>> = new Map();

  readonly groupsByLabel: Map<string, ResourceGroupTypeCast<T>> = new Map();

  constructor(x: T[]) {
    x.forEach((resource) => {
      this.add(resource, false);
    });

    this.syncItemsToSet();
  }

  private syncItemsToSet = () => {
    this.items.clear();
    this.resourceFiles.clear();
    this.resourceGroups.clear();

    [...this.itemsById.values()].forEach((x) => {
      this.items.add(x);

      if (x.type === 'file') {
        this.resourceFiles.add(x as ResourceFileTypeCast<T>);
      } else if (x.type === 'group') {
        this.resourceGroups.add(x as ResourceGroupTypeCast<T>);
      }
    });
  };

  add = (x: T, sync = true) => {
    this.itemsById.set(x.id, x);
    this.itemsByLabel.set(x.label, x);

    if (x.type === 'group') {
      this.groupsById.set(x.id, x as ResourceGroupTypeCast<T>);
      this.groupsByLabel.set(x.label, x as ResourceGroupTypeCast<T>);
    } else if (x.type === 'file') {
      this.filesById.set(x.id, x as ResourceFileTypeCast<T>);
      this.filesByLabel.set(x.label, x as ResourceFileTypeCast<T>);
    }

    if (sync) this.syncItemsToSet();
  };

  remove = (x: T) => {
    this.itemsById.delete(x.id);
    this.itemsByLabel.delete(x.label);
    this.groupsById.delete(x.id);
    this.groupsByLabel.delete(x.label);
    this.filesById.delete(x.id);
    this.filesByLabel.delete(x.label);

    this.syncItemsToSet();
  };
}

export const cleanUpResourceListForClient = <FormatFileField extends boolean>(
  resources: IResourceItem[],
  format: FormatFileField = false as FormatFileField,
): FormatFileField extends true
    ? IDetailedResourceItemForClient[]
    : IResourceItemForClient[] => {
  const cleanedResource: IResourceItemForClient[] = resources.map(
    (resource) => {
      if (resource.type === 'file') {
        return pick(resource, [
          'type',
          'id',
          'label',
          'mimeType',
          'convertedHash',
          'cacheToHardDisk',
          'preloadLevel',
          'preloadTriggers',
          'episodeIds',
          'duration',
          'resourceGroupId',
          'url',
          'tags',
          'fileName',
          'postProcessRecord',
          'extensionConfigurations',
        ] as const) as IResourceFileForClient;
      }
      if (resource.type === 'group') {
        return pick(resource, [
          'type',
          'id',
          'label',
          'files',
          'postProcessRecord',
          'tags',
        ] as const) as IResourceGroupForClient;
      }
      throw new TypeError('Invalid resource type');
    },
  );

  // @ts-ignore: Expected typings
  if (!format) return cleanedResource;

  const fileMap: Map<string, IResourceFile> = new Map();

  resources.forEach((resource) => {
    if (resource.type === 'file') {
      fileMap.set(resource.id, resource as IResourceFile);
    }
  });

  const convertedResources: IDetailedResourceItemForClient[] = cleanedResource.map(
    (resource) => {
      if (resource.type === 'file') {
        return resource;
      } if (resource.type === 'group') {
        return {
          ...resource,
          files: resource.files.map((fileId) => fileMap.get(fileId)!).filter(Boolean),
        } as IDetailedResourceGroupForClient;
      }
      throw new TypeError('Invalid resource type');
    },
  );

  // @ts-ignore: Expected typings
  return convertedResources;
};
