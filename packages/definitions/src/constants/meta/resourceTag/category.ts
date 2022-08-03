import { LabelType } from './meta';
import type { IResourceTag } from '../../../typings/meta/resourceTag';

export enum Category {
  Image = 'category:image',
  Video = 'category:video',
  Audio = 'category:audio',
  Subtitle = 'category:subtitle',
  Triggers = 'category:triggers',
  Others = 'category:others',
  ApBundle = 'category:ap-bundle',
}

export interface ICategoryResourceTag extends IResourceTag {
  type: LabelType.Category;
  id: Category;
}

export const imageCategoryTag: ICategoryResourceTag = {
  id: Category.Image,
  label: 'Image',
  type: LabelType.Category,
};

export const videoCategoryTag: ICategoryResourceTag = {
  id: Category.Video,
  label: 'Video',
  type: LabelType.Category,
};

export const audioCategoryTag: ICategoryResourceTag = {
  id: Category.Audio,
  label: 'Audio',
  type: LabelType.Category,
};

export const subtitleCategoryTag: ICategoryResourceTag = {
  id: Category.Subtitle,
  label: 'Subtitle',
  type: LabelType.Category,
};

export const triggersCategoryTag: ICategoryResourceTag = {
  id: Category.Triggers,
  label: 'Triggers',
  type: LabelType.Category,
};

export const othersCategoryTag: ICategoryResourceTag = {
  id: Category.Others,
  label: 'Others',
  type: LabelType.Category,
};

export const apBundleCategoryTag: ICategoryResourceTag = {
  id: Category.ApBundle,
  label: 'ApBundle',
  type: LabelType.Category,
};

export const categoryTags: ICategoryResourceTag[] = [
  imageCategoryTag,
  videoCategoryTag,
  audioCategoryTag,
  subtitleCategoryTag,
  triggersCategoryTag,
  othersCategoryTag,
  apBundleCategoryTag,
];
