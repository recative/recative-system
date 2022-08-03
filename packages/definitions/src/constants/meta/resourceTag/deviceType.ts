import { LabelType } from './meta';
import type { IResourceTag } from '../../../typings/meta/resourceTag';

export enum DeviceType {
  TouchScreen = 'device:touch',
  Mouse = 'device:mouse',
}

export interface IDeviceTypeResourceTag extends IResourceTag {
  type: LabelType.DeviceType;
  id: DeviceType;
}

export const touchScreenResourceTag: IDeviceTypeResourceTag = {
  id: DeviceType.TouchScreen,
  label: 'Touch',
  type: LabelType.DeviceType,
};

export const mouseResourceTag: IDeviceTypeResourceTag = {
  id: DeviceType.Mouse,
  label: 'Mouse',
  type: LabelType.DeviceType,
};

export const deviceTypeResourceTags: IDeviceTypeResourceTag[] = [
  touchScreenResourceTag,
  mouseResourceTag,
];
