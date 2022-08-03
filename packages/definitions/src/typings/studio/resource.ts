import type { IResourceFile } from '../meta/resource';

export interface IEditableResourceFile extends IResourceFile {
  dirty: boolean;
}
