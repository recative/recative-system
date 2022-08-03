import { LabelType } from './meta';
import type { IResourceTag } from '../../../typings/meta/resourceTag';

export enum MetaStatus {
  Empty = 'meta-status:empty',
}

export interface IMetaStatusResourceTag extends IResourceTag {
  readonly type: LabelType.MetaStatus;
  readonly id: MetaStatus;
}

export const emptyResourceTag: IMetaStatusResourceTag = {
  id: MetaStatus.Empty,
  label: 'Empty',
  type: LabelType.MetaStatus,
};

export const metaStatusResourceTags: IMetaStatusResourceTag[] = [
  emptyResourceTag,
];
