import type { IResourceTag, IGroupTypeResourceTag } from '../../../typings/meta/resourceTag';
import { LabelType } from './meta';
import { metaStatusResourceTags } from './metaStatus';
import { languageResourceTags } from './language';
import { deviceTypeResourceTags } from './deviceType';
import { screenSizeResourceTags } from './screenSize';
import { clientResourceTags } from './clientType';
import { engineResourceTags } from './engine';
import { roleResourceTags } from './role';
import { categoryTags } from './category';
import { groupTags } from './group';

export const tagsByType: Record<LabelType, IResourceTag[]> = {
  [LabelType.MetaStatus]: metaStatusResourceTags,
  [LabelType.Language]: languageResourceTags,
  [LabelType.DeviceType]: deviceTypeResourceTags,
  [LabelType.ScreenSize]: screenSizeResourceTags,
  [LabelType.ClientType]: clientResourceTags,
  [LabelType.Role]: roleResourceTags,
  [LabelType.Category]: categoryTags,
  [LabelType.Engine]: engineResourceTags,
  [LabelType.Custom]: [],
};

export const typeNameMap: Record<LabelType, string> = {
  [LabelType.MetaStatus]: 'Meta Status',
  [LabelType.Language]: 'Language',
  [LabelType.DeviceType]: 'Device Type',
  [LabelType.ScreenSize]: 'Screen Size',
  [LabelType.ClientType]: 'Client Type',
  [LabelType.Custom]: 'Custom',
  [LabelType.Role]: 'Role',
  [LabelType.Category]: 'Category',
  [LabelType.Engine]: 'Engine',
};

export const allTags: (IResourceTag | IGroupTypeResourceTag)[] = [
  ...metaStatusResourceTags,
  ...languageResourceTags,
  ...deviceTypeResourceTags,
  ...screenSizeResourceTags,
  ...clientResourceTags,
  ...roleResourceTags,
  ...categoryTags,
  ...groupTags,
];

export const tagIdMap: Record<string, IResourceTag | IGroupTypeResourceTag> = {};

allTags.forEach((tag) => {
  tagIdMap[tag.id] = tag;
});
