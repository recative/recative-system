import { LabelType } from './meta';
import type { IResourceTag } from '../../../typings/meta/resourceTag';

export enum ScreenSize {
  Small = 'screen:small', // [667,    ]
  Medium = 'screen:medium', // [812, 667]
  Large = 'screen:large', // [  0, 812)
}

export interface IScreenSizeResourceTag extends IResourceTag {
  type: LabelType.ScreenSize;
  id: ScreenSize;
}

export const smallScreenResourceTag: IScreenSizeResourceTag = {
  id: ScreenSize.Small,
  label: 'Small',
  type: LabelType.ScreenSize,
};

export const mediumScreenResourceTag: IScreenSizeResourceTag = {
  id: ScreenSize.Medium,
  label: 'Medium',
  type: LabelType.ScreenSize,
};

export const largeScreenResourceTag: IScreenSizeResourceTag = {
  id: ScreenSize.Large,
  label: 'Large',
  type: LabelType.ScreenSize,
};

export const screenSizeResourceTags: IScreenSizeResourceTag[] = [
  smallScreenResourceTag,
  mediumScreenResourceTag,
  largeScreenResourceTag,
];
