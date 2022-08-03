import type { IGroupTypeResourceTag } from '../../../typings/meta/resourceTag';

export enum GroupType {
  Video = 'group:video',
  Texture = 'group:texture',
  FrameSequence = 'group:frameSequence',
  General = 'group:general',
}

export const videoGroupResourceTag: IGroupTypeResourceTag = {
  id: GroupType.Video,
  label: 'Video',
  type: 'group',
};

export const textureGroupResourceTag: IGroupTypeResourceTag = {
  id: GroupType.Texture,
  label: 'Texture',
  type: 'group',
};

export const frameSequenceGroupResourceTag: IGroupTypeResourceTag = {
  id: GroupType.FrameSequence,
  label: 'Frame Sequence',
  type: 'group',
};

export const generalGroupResourceTag: IGroupTypeResourceTag = {
  id: GroupType.General,
  label: 'General',
  type: 'group',
};

export const groupTags: IGroupTypeResourceTag[] = [
  videoGroupResourceTag,
  textureGroupResourceTag,
  frameSequenceGroupResourceTag,
  generalGroupResourceTag,
];
