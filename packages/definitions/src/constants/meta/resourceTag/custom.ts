import { LabelType } from './meta';
import type { IResourceTag } from '../../../typings/meta/resourceTag';

export interface ICustomTypeResourceTag extends IResourceTag {
  type: LabelType.Custom;
  id: string;
}
