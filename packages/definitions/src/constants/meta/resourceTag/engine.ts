import { LabelType } from './meta';
import type { IResourceTag } from '../../../typings/meta/resourceTag';

export enum Engine {
  Blink = 'engine:blink',
  Webkit = 'engine:webkit',
  Gecko = 'engine:gecko',
  Goanna = 'engine:goanna',
  Flow = 'engine:flow',
  Serenity = 'engine:serenity',
  Others = 'engine:others',
}

export interface IEngineResourceTag extends IResourceTag {
  type: LabelType.Engine;
  id: Engine;
}

export const blinkEngineResourceTag: IEngineResourceTag = {
  id: Engine.Blink,
  label: 'Blink',
  type: LabelType.Engine,
};

export const webkitEngineResourceTag: IEngineResourceTag = {
  id: Engine.Webkit,
  label: 'Webkit',
  type: LabelType.Engine,
};

export const geckoEngineResourceTag: IEngineResourceTag = {
  id: Engine.Gecko,
  label: 'Gecko',
  type: LabelType.Engine,
};

export const goannaEngineResourceTag: IEngineResourceTag = {
  id: Engine.Goanna,
  label: 'Goanna',
  type: LabelType.Engine,
};

export const flowEngineResourceTag: IEngineResourceTag = {
  id: Engine.Flow,
  label: 'Flow',
  type: LabelType.Engine,
};

export const serenityEngineResourceTag: IEngineResourceTag = {
  id: Engine.Serenity,
  label: 'Serenity',
  type: LabelType.Engine,
};

export const othersEngineResourceTag: IEngineResourceTag = {
  id: Engine.Others,
  label: 'Others',
  type: LabelType.Engine,
};

export const engineResourceTags: IEngineResourceTag[] = [
  blinkEngineResourceTag,
  webkitEngineResourceTag,
  geckoEngineResourceTag,
  goannaEngineResourceTag,
  flowEngineResourceTag,
  serenityEngineResourceTag,
  othersEngineResourceTag,
];
