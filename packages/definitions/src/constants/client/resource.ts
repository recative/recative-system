import { IResourceFile, IResourceGroup } from '../../typings/meta/resource';

export const MANAGED_RESOURCE_FILE_KEYS: Readonly<(keyof IResourceFile)[]> = [
  'cacheToHardDisk',
  'preloadLevel',
  'preloadTriggers',
  'episodeIds',
  'removed',
  'removedTime',
  'resourceGroupId',
  'tags',
  'extensionConfigurations',
] as const;

export const RESOURCE_FILE_KEYS_FOR_CLIENT: Readonly<(keyof IResourceFile)[]> = [
  'type',
  'id',
  'label',
  'mimeType',
  'redirectTo',
  'convertedHash',
  'cacheToHardDisk',
  'preloadLevel',
  'preloadTriggers',
  'url',
  'episodeIds',
  'duration',
  'resourceGroupId',
  'tags',
  'extensionConfigurations',
] as const;

export type ResourceFileKeysForClient = typeof RESOURCE_FILE_KEYS_FOR_CLIENT[number];

export const RESOURCE_GROUP_KEYS_FOR_CLIENT: Readonly<(keyof Partial<IResourceGroup>)[]> = [
  'type',
  'id',
  'label',
  'files',
  'tags',
] as const;

export type ResourceGroupKeysForClient = typeof RESOURCE_GROUP_KEYS_FOR_CLIENT[number];
