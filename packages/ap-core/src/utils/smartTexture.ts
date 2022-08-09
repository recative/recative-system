import { IResourceFileForClient } from '@recative/definitions';
import { DataSource, useSelector } from '../core/DataSource';
import { useEnvVariableDataSource } from '../hooks/envVariableHooks';
import * as PIXI from 'pixi.js-legacy';
import { useResourceUrlByIdFetcher } from '../hooks/resourceManagerHooks';
import { FunctionalAtomDefinition } from '../core/AtomStore';
import { useStore } from '../hooks/baseHooks';

const DEFAULT_TEXTURE_RELEASED_DATA_SOURCE = new DataSource(false);
export const DefaultTextureReleasedDataSource = DEFAULT_TEXTURE_RELEASED_DATA_SOURCE.subscribe;

export interface SmartTextureInfo {
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
    const url = await (async () => {
      try {
        return await resourceUrlByIdFetcher(file.id);
      } catch (err) {
        throw new Error(`Error when invoking resourceUrlByIdFetcher, id:${file.id}, original error:${err}`)
      }
    })()
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

export const useSmartResourceConfig = () => {
  const envVariableDataSource = useEnvVariableDataSource();
  const smartResourceConfigStringDataSource = useSelector(envVariableDataSource, (env) => {
    const smartResourceConfig = env?.__smartResourceConfig
    if (!smartResourceConfig) {
      return null
    }
    return JSON.stringify(smartResourceConfig, Object.keys(smartResourceConfig).sort())
  })
  return useSelector(smartResourceConfigStringDataSource, (str) => {
    if (str === null) {
      return null
    } else {
      return JSON.parse(str) as Record<string, string>
    }
  })
}

const BASE_TEXTURE_STORE = FunctionalAtomDefinition<Map<string, { refCount: number, texture: PIXI.BaseTexture }>>(
  () => new Map(),
);


export const useSmartTextureRC = () => {
  const [getTextureMap] = useStore(BASE_TEXTURE_STORE);
  const textureMap = getTextureMap();
  const acquire = (url: string) => {
    if (textureMap.has(url)) {
      const rcCell = textureMap.get(url)!
      rcCell.refCount += 1
      return rcCell.texture
    } else {
      const texture = PIXI.BaseTexture.from(url)
      textureMap.set(url, { refCount: 1, texture })
      return texture
    }
  }
  const release = (url: string) => {
    if (textureMap.has(url)) {
      const rcCell = textureMap.get(url)!
      rcCell.refCount -= 1
      if (rcCell.refCount <= 0) {
        rcCell.texture.destroy();
        textureMap.delete(url)
      }
    }
  }
  return {
    acquire,
    release,
  }
}
