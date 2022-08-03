import { LabelType } from './meta';
import type { IResourceTag } from '../../../typings/meta/resourceTag';

export enum Role {
  Video = 'role:video',
  Audio = 'role:audio',
  Subtitle = 'role:subtitle',
}

export interface IRoleResourceTag extends IResourceTag {
  type: LabelType.Role;
  id: Role;
}

export const videoRoleResourceTag: IRoleResourceTag = {
  id: Role.Video,
  label: 'Video',
  type: LabelType.Role,
};

export const audioRoleResourceTag: IRoleResourceTag = {
  id: Role.Audio,
  label: 'Audio',
  type: LabelType.Role,
};

export const subtitleResourceTag: IRoleResourceTag = {
  id: Role.Subtitle,
  label: 'Subtitle',
  type: LabelType.Role,
};

export const roleResourceTags: IRoleResourceTag[] = [
  videoRoleResourceTag,
  audioRoleResourceTag,
  subtitleResourceTag,
];
