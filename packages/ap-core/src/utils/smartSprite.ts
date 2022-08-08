import * as PIXI from 'pixi.js-legacy';

import { IResourceFileForClient } from '@recative/definitions';
import { getMatchedResource, ResourceEntry } from '@recative/smart-resource';

import { useQuery } from '../hooks/fetchDataHooks';
import { DataSource, useCombinator, useSelector } from '../core/DataSource';
import {
  DefaultTagDataSource,
  useResourceMetadataByLabelFetcher,
} from '../hooks/resourceManagerHooks';
import {
  SmartTextureInfo,
  useSmartResourceConfig,
  useSmartTextureInfoFromResourceMetadata,
} from './smartTexture';
import type { DataSourceNode, DataSourceNodeController, Subscribable } from '../types/dataSource';

const useSmartTextureInfo = (
  labelDataSource: Subscribable<string>,
  tagDataSource: Subscribable<string> = DefaultTagDataSource,
): DataSourceNode<SmartTextureInfo | null> => {
  const smartResourceConfigDataSource = useSmartResourceConfig();
  const {
    subscribeResultUpdate: metadataResponseDataSource,
  } = useQuery(labelDataSource, useResourceMetadataByLabelFetcher());

  const combinedDataSource = useCombinator(
    smartResourceConfigDataSource,
    metadataResponseDataSource,
    tagDataSource,
  );

  const selectedMetadataDataSource = useSelector(combinedDataSource, ([smartResourceConfig, metadataResponse, tag]) => {
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
      return metadata;
    }
    const files: ResourceEntry<IResourceFileForClient>[] = metadata.files.map((file) => ({
      selector: file.tags,
      item: file,
    }));

    const file = getMatchedResource(
      files,
      {
        ...smartResourceConfig,
        custom: tag || 'unknown',
      },
    );

    if (!file) {
      return null;
    }
    return file;
  });

  const getSmartTextureInfoFromResourceMetadata = useSmartTextureInfoFromResourceMetadata();

  const {
    subscribeResultUpdate: textureInfoDataResponseDataSource,
  } = useQuery(selectedMetadataDataSource, async (file) => {
    if (file === undefined) {
      return null;
    }
    const smartTextureInfo = getSmartTextureInfoFromResourceMetadata(file);
    return smartTextureInfo;
  });

  const textureInfoDataSource = useSelector(
    textureInfoDataResponseDataSource, (textureInfoResponse) => {
      if (textureInfoResponse === null) {
        return null;
      }
      if (!textureInfoResponse?.success) {
        console.warn('Failed to generate SmartTextureInfo:', textureInfoResponse.error);
        return {};
      }
      return textureInfoResponse.data;
    },
  );

  return textureInfoDataSource;
};

export interface SmartSpriteOption{
  label?: string,
  tag?: string;
}

export class SmartSprite extends PIXI.Sprite {
  private labelDataSource: DataSource<string>;

  private tagDataSource: DataSource<string>;

  private smartTextureInfoDataSource: DataSourceNode<SmartTextureInfo | null>;

  private smartTextureInfoController: DataSourceNodeController<SmartTextureInfo | null>;

  constructor(option: SmartSpriteOption) {
    super(PIXI.Texture.EMPTY);
    this.labelDataSource = new DataSource(option.label ?? '');
    this.tagDataSource = new DataSource(option.tag ?? 'unknown');
    this.smartTextureInfoDataSource = useSmartTextureInfo(this.labelDataSource.subscribe, this.tagDataSource.subscribe);
    this.smartTextureInfoController = this.smartTextureInfoDataSource(this.updateTexture);
    this.updateTexture(this.smartTextureInfoController.getter());
  }

  private static createTextureFromSmartTextureInfo(smartTextureInfo: SmartTextureInfo) {
    const { url } = smartTextureInfo;
    if (url === undefined) {
      return PIXI.Texture.EMPTY;
    }

    const baseTexture = PIXI.BaseTexture.from(url);

    return new PIXI.Texture(
      baseTexture, smartTextureInfo.frame, smartTextureInfo.orig, smartTextureInfo.trim, smartTextureInfo.rotate,
    );
  }

  private onTextureUpdate = () => {
    this.emit('textureupdate', {});
  };

  private updateTexture = (smartTextureInfo: SmartTextureInfo | null) => {
    if (smartTextureInfo === null) {
      return;
    }
    const oldTexture = super.texture;
    super.texture = SmartSprite.createTextureFromSmartTextureInfo(smartTextureInfo);
    super.texture.on('update', this.onTextureUpdate);
    oldTexture.off('update', this.onTextureUpdate);
    oldTexture.destroy();
    this.emit('textureupdate', {});
  };

  get label() {
    return this.labelDataSource.data;
  }

  set label(value: string) {
    this.labelDataSource.data = value;
  }

  get tag() {
    return this.labelDataSource.data;
  }

  set tag(value: string) {
    this.tagDataSource.data = value;
  }

  destroy(...param: Parameters<typeof PIXI.Sprite.prototype.destroy>) {
    this.smartTextureInfoController.unsubscribe();
    super.destroy(...param);
  }
}
