import type { LabelType, GroupType } from '../../constants';

export interface IResourceTag {
  readonly id: string;
  readonly label: string;
  readonly type: LabelType;
}

export interface IGroupTypeResourceTag {
  type: 'group';
  id: GroupType;
  label: string;
}
