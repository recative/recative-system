import { IResourceFileForClient } from '@recative/definitions';
import * as PIXI from 'pixi.js-legacy';
import { useResourceUrlByIdFetcher } from '../hooks/resourceManagerHooks';

export interface SmartTextureInfo{
  url?: string
  frame?: PIXI.Rectangle
  orig?: PIXI.Rectangle
  trim?: PIXI.Rectangle
  rotate?: number
}

export const ATLAS_EX_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~ex';
export const ATLAS_EY_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~ey';
export const ATLAS_EW_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~ew';
export const ATLAS_EH_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~eh';
export const ATLAS_TW_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~tw';
export const ATLAS_TH_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~th';
export const ATLAS_X_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~x';
export const ATLAS_Y_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~y';
export const ATLAS_W_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~w';
export const ATLAS_H_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~h';
export const ATLAS_F_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~f';
export const ATLAS_ENABLE_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~enabled';
export const ATLAS_FRAMES_KEY = '@recative/extension-rs-atlas/AtlasResourceProcessor~~frames';

export const atlasKeys = [
  ATLAS_EX_KEY,
  ATLAS_EY_KEY,
  ATLAS_EW_KEY,
  ATLAS_EH_KEY,
  ATLAS_TW_KEY,
  ATLAS_TH_KEY,
  ATLAS_X_KEY,
  ATLAS_Y_KEY,
  ATLAS_W_KEY,
  ATLAS_H_KEY,
  ATLAS_F_KEY,
  ATLAS_ENABLE_KEY,
];

export const useSmartTextureInfoFromResourceMetadata = () => {
  const resourceUrlByIdFetcher = useResourceUrlByIdFetcher();
  return async (file: IResourceFileForClient | null): Promise<SmartTextureInfo> => {
    if (file === null) {
      return {};
    }
    const url = await resourceUrlByIdFetcher(file.id);
    if (url === null) {
      return {};
    }
    const smartTextureInfo: SmartTextureInfo = { url };

    if (!('extensionConfigurations' in file)) {
      return smartTextureInfo;
    }

    const extension = file.extensionConfigurations;

    if (atlasKeys.every((key) => key in extension)) {
      if (extension[ATLAS_ENABLE_KEY] === 'yes') {
      /*
      On baseTexture:
      +----------------+
      |    |           |
      |    y           |
      |    |           |
      |--x-+--w--+     |
      |    |     |     |
      |    h     |     |
      |    |     |     |
      |    +-----+     |
      |                |
      +----------------+
      On Texture:
      +----------------+
      |    |           |
      |   ey           |
      |    |           |
      |-ex-+-ew--+    th
      |    |     |     |
      |   eh     |     |
      |    |     |     |
      |    +-----+     |
      |                |
      +---tw-----------+
      *if f, w===eh && h===ew
      *else, w===ew && h===eh
      For pixi.js:
      frame=[x,y,w,h]
      orig=f?[0,0,w,h]:[0,0,h,w]
      trim=[ex,ey,ew,eh]
      rotate=f?PIXI.groupD8.S:PIXI.groupD8.E
      */
        const rotated = String(extension[ATLAS_F_KEY]) === 'true';
        smartTextureInfo.frame = new PIXI.Rectangle(
          Number(extension[ATLAS_X_KEY]),
          Number(extension[ATLAS_Y_KEY]),
          Number(extension[ATLAS_W_KEY]),
          Number(extension[ATLAS_H_KEY]),
        );
        smartTextureInfo.orig = new PIXI.Rectangle(
          0,
          0,
          Number(extension[ATLAS_TW_KEY]),
          Number(extension[ATLAS_TH_KEY]),
        );
        smartTextureInfo.trim = new PIXI.Rectangle(
          Number(extension[ATLAS_EX_KEY]),
          Number(extension[ATLAS_EY_KEY]),
          Number(extension[ATLAS_EW_KEY]),
          Number(extension[ATLAS_EH_KEY]),
        );
        smartTextureInfo.rotate = rotated ? PIXI.groupD8.S : PIXI.groupD8.E;
      }
    }

    return smartTextureInfo;
  };
};
