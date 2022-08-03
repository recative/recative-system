import { LabelType } from './meta';
import type { IResourceTag } from '../../../typings/meta/resourceTag';

export enum Language {
  ZHHans = 'lang:zh-Hans',
  ZHHant = 'lang:zh-Hant',
  En = 'lang:en',
}

export interface ILanguageResourceTag extends IResourceTag {
  type: LabelType.Language;
  id: Language;
}

export const zhHansResourceTag: ILanguageResourceTag = {
  id: Language.ZHHans,
  label: 'ZH-Hans',
  type: LabelType.Language,
};

export const zhHantResourceTag: ILanguageResourceTag = {
  id: Language.ZHHant,
  label: 'ZH-Hant',
  type: LabelType.Language,
};

export const enResourceTag: ILanguageResourceTag = {
  id: Language.En,
  label: 'EN',
  type: LabelType.Language,
};

export const languageResourceTags: ILanguageResourceTag[] = [
  zhHansResourceTag,
  zhHantResourceTag,
  enResourceTag,
];
