import { LabelType } from './meta';
import type { IResourceTag } from '../../../typings/meta/resourceTag';

export enum ClientType {
  Web = 'client:web',
  App = 'client:app',
  MiniActPoint = 'client:mini-ap',
  Desktop = 'client:desktop',
}

export interface IClientTypeResourceTag extends IResourceTag {
  type: LabelType.ClientType;
  id: ClientType;
}

export const webClientResourceTag: IClientTypeResourceTag = {
  id: ClientType.Web,
  label: 'Web',
  type: LabelType.ClientType,
};

export const appClientResourceTag: IClientTypeResourceTag = {
  id: ClientType.App,
  label: 'App',
  type: LabelType.ClientType,
};

export const miniActPointResourceTag: IClientTypeResourceTag = {
  id: ClientType.MiniActPoint,
  label: 'Mini AP',
  type: LabelType.ClientType,
};

export const desktopClientResourceTag: IClientTypeResourceTag = {
  id: ClientType.Desktop,
  label: 'Desktop',
  type: LabelType.ClientType,
};

export const clientResourceTags: IClientTypeResourceTag[] = [
  webClientResourceTag,
  appClientResourceTag,
  miniActPointResourceTag,
  desktopClientResourceTag,
];
