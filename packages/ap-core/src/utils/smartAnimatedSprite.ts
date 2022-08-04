import { DataSourceNode, DataSourceNodeController, Subscribable } from 'types/dataSource';
import { getMatchedResource, ResourceEntry } from '@recative/smart-resource';
import { IResourceFileForClient } from '@recative/definitions';
import * as PIXI from 'pixi.js-legacy';
import { useQuery } from '../hooks/fetchDataHooks';
import { useResourceMetadataByIdFetcher, useResourceMetadataByLabelFetcher } from '../hooks/resourceManagerHooks';
import { ATLAS_FRAMES_KEY, SmartTextureInfo, useSmartResourceConfig, useSmartTextureInfoFromResourceMetadata } from './smartTexture';
import { DataSource, useCombinator, useSelector } from '../core/DataSource';

const useSmartTextureInfoSequence = (
  labelDataSource: Subscribable<string>,
): DataSourceNode<SmartTextureInfo[] | null> => {
  const smartResourceConfigDataSource = useSmartResourceConfig();
  const {
    subscribeResultUpdate: metadataResponseDataSource,
  } = useQuery(labelDataSource, useResourceMetadataByLabelFetcher());
  const combinedDataSource = useCombinator(
    smartResourceConfigDataSource,
    metadataResponseDataSource,
  );

  const frameIdsDataSource = useSelector(combinedDataSource, ([smartResourceConfig, metadataResponse]) => {
    if (metadataResponse === null) {
      return undefined;
    }
    if (smartResourceConfig === null) {
      return null;
    }
    if (!metadataResponse?.success) {
      console.warn('Failed to get metadata:', metadataResponse.error);
      return null;
    }
    const metadata = metadataResponse.data;
    if (metadata === null) return null;
    if (!('type' in metadata)) {
      return null;
    }

    if (metadata.type === 'file') {
      return null;
    }
    const files: ResourceEntry<IResourceFileForClient>[] = metadata.files.map((file) => ({
      selector: file.tags,
      item: file,
    }));

    const file = getMatchedResource(
      files,
      {
        ...smartResourceConfig,
        custom: 'frame-sequence-pointer!',
      },
    );

    if (!file) {
      return null;
    }

    if (!('extensionConfigurations' in file)) {
      return null;
    }
    const extension = file.extensionConfigurations;

    if (!(ATLAS_FRAMES_KEY in extension)) {
      return null;
    }

    return String(extension[ATLAS_FRAMES_KEY]).split(',');
  });

  const resourceUrlByIdFetcher = useResourceMetadataByIdFetcher();
  const getSmartTextureInfoFromResourceMetadata = useSmartTextureInfoFromResourceMetadata();
  const {
    subscribeResultUpdate: frameInfosResponseDataSource,
  } = useQuery(frameIdsDataSource, async (frameIds) => {
    if (frameIds === undefined) {
      return null;
    }
    if (frameIds === null) {
      return [];
    }
    const frames = await Promise.all(
      frameIds.map(resourceUrlByIdFetcher)
        .map(async (file) => {
          const f = await file;
          if (f?.type === 'group') {
            return {};
          }
          return getSmartTextureInfoFromResourceMetadata(f);
        }),
    );
    return frames;
  });

  const frameTextureInfosDataSource = useSelector(
    frameInfosResponseDataSource, (frameInfosResponse) => {
      if (frameInfosResponse === null) {
        return null;
      }
      if (!frameInfosResponse?.success) {
        console.warn('Failed to generate SmartTextureInfos:', frameInfosResponse.error);
        return [];
      }
      return frameInfosResponse.data;
    },
  );

  return frameTextureInfosDataSource;
};

export interface SmartAnimatedSpriteOption{
  label?: string,
  tag?: string;
}

export class SmartAnimatedSprite extends PIXI.AnimatedSprite {
  private labelDataSource: DataSource<string>;

  private smartTextureInfoDataSource: DataSourceNode<SmartTextureInfo[] | null>;

  private smartTextureInfoController: DataSourceNodeController<SmartTextureInfo[] | null>;

  constructor(option: SmartAnimatedSpriteOption) {
    super([PIXI.Texture.EMPTY]);
    this.labelDataSource = new DataSource(option.label ?? '');
    this.smartTextureInfoDataSource = useSmartTextureInfoSequence(this.labelDataSource.subscribe);
    this.smartTextureInfoController = this.smartTextureInfoDataSource(this.updateTextureSequence);
    this.updateTextureSequence(this.smartTextureInfoController.getter());
  }

  private static createTexturesFromSmartTextureInfo(smartTextureInfos: SmartTextureInfo[]) {
    if (smartTextureInfos.length <= 0) {
      return [PIXI.Texture.EMPTY];
    }
    return smartTextureInfos.map((smartTextureInfo) => {
      const { url } = smartTextureInfo;
      if (url === undefined) {
        return PIXI.Texture.EMPTY;
      }
      const baseTexture = PIXI.BaseTexture.from(url);
      return new PIXI.Texture(
        baseTexture, smartTextureInfo.frame, smartTextureInfo.orig, smartTextureInfo.trim, smartTextureInfo.rotate,
      );
    });
  }

  private updateTextureSequence = (smartTextureInfo: SmartTextureInfo[] | null) => {
    if (smartTextureInfo === null) {
      return;
    }
    const playing = this.playing;
    const oldTextures = super.textures;
    super.textures = SmartAnimatedSprite.createTexturesFromSmartTextureInfo(smartTextureInfo);
    oldTextures.forEach((oldTexture) => {
      if (oldTexture instanceof PIXI.Texture) {
        oldTexture.destroy();
      } else {
        oldTexture.texture.destroy();
      }
    });
    // Animated sprite won't update scale with saved width/height after setting the textures so we should manually update it here
    this._onTextureUpdate()
    // Animated sprite will stop automatically after reset the textures, so restore playing state here
    if (playing) {
      this.play();
    }
  };

  get label() {
    return this.labelDataSource.data;
  }

  set label(value: string) {
    this.labelDataSource.data = value;
  }

  destroy(...param: Parameters<typeof PIXI.Sprite.prototype.destroy>) {
    this.smartTextureInfoController.unsubscribe();
    super.destroy(...param);
  }
}
