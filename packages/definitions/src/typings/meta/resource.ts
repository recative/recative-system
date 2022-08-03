import type { IResourceTag, IGroupTypeResourceTag } from './resourceTag';
import type { PreloadLevel } from '../../constants/meta/resource';

export interface IResourceFile {
  readonly type: 'file';
  readonly id: string;
  /**
   * This should ONLY be available for online resource in production mode,
   * the field will appear when multiple resources are merged into one.
   * The value should be the id of the id of the target resource.
   */
  redirectTo?: string;
  /**
   * A managed file means all managed fields will be locked, changes with
   * the target file.
   */
  managedBy: string | null;
  label: string;
  readonly mimeType: string;
  readonly originalHash: string;
  readonly convertedHash: {
    readonly xxHash: string;
    readonly md5: string;
  };
  url: Record<string, string>;
  cacheToHardDisk: boolean;
  preloadLevel: PreloadLevel;
  preloadTriggers: string[];
  episodeIds: string[];
  readonly thumbnailSrc: string | null;
  readonly duration: number | null;
  readonly importTime: number;
  removed: boolean;
  removedTime: number;
  resourceGroupId: string;
  tags: IResourceTag['id'][];
  extensionConfigurations: Record<string, string>;
}

export interface IResourceGroup {
  readonly type: 'group';
  readonly id: string;
  label: string;
  readonly thumbnailSrc: string | null;
  readonly importTime: number;
  removed: boolean;
  removedTime: number;
  resourceGroupId?: never;
  tags: IGroupTypeResourceTag['id'][];
  files: string[];
}

export type IResourceItem = IResourceFile | IResourceGroup;
