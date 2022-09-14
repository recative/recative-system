import * as PIXI from 'pixi.js-legacy';

import { IResourceFileForClient } from '@recative/definitions';
import { getMatchedResource, ResourceEntry } from '@recative/smart-resource';

import { IFailedResponse, useQuery } from '../hooks/fetchDataHooks';
import { DataSource, useCombinator, useSelector } from '../core/DataSource';
import {
  DefaultTagDataSource,
  useResourceMetadataByLabelFetcher,
} from '../hooks/resourceManagerHooks';
import {
  DefaultTextureReleasedDataSource,
  SmartTextureInfo,
  useSmartResourceConfig,
  useSmartTextureInfoFromResourceMetadata,
  useSmartTextureRC,
} from './smartTexture';
import type { DataSourceNode, DataSourceNodeController, Subscribable } from '../types/dataSource';
import { useEventTarget } from '../hooks/baseHooks';
import { CHECK_SMART_TEXTURE_RELEASE } from './smartTextureReleaseChecker';

const useSmartTextureInfo = (
  labelDataSource: Subscribable<string>,
  tagDataSource: Subscribable<string> = DefaultTagDataSource,
  textureReleasedDataSource: Subscribable<boolean> = DefaultTextureReleasedDataSource,
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

  const selectedMetadataDataSource = useSelector(
    combinedDataSource, ([smartResourceConfig, metadataResponse, tag]) => {
      if (metadataResponse === null) {
        return undefined;
      }
      if (smartResourceConfig === null) {
        return null;
      }
      if (!metadataResponse?.success) {
        console.warn(
          'Failed to get metadata:',
          (metadataResponse as IFailedResponse).error,
        );
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
    },
  );

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
        console.warn(
          'Failed to generate SmartTextureInfo:',
          (textureInfoResponse as IFailedResponse).error,
        );
        return {};
      }
      return textureInfoResponse.data;
    },
  );

  return useSelector(useCombinator(
    textureInfoDataSource, textureReleasedDataSource,
  ), ([textureInfo, hidden]) => {
    if (hidden) {
      return {};
    }
    return textureInfo;
  });
};

export interface SmartSpriteOption {
  label?: string;
  tag?: string;
  autoReleaseTexture?: boolean;
}

export class SmartSprite extends PIXI.Sprite {
  private labelDataSource: DataSource<string>;

  private tagDataSource: DataSource<string>;

  private textureReleasedDataSource: DataSource<boolean>;

  private smartTextureInfoDataSource: DataSourceNode<SmartTextureInfo | null>;

  private smartTextureInfoController: DataSourceNodeController<SmartTextureInfo | null>;

  private smartTextureRc: ReturnType<typeof useSmartTextureRC>;

  private autoReleaseTexture: boolean;

  private eventTarget: ReturnType<typeof useEventTarget>;

  constructor(option: SmartSpriteOption) {
    super(PIXI.Texture.EMPTY);
    this.autoReleaseTexture = option.autoReleaseTexture ?? false;
    this.smartTextureRc = useSmartTextureRC();
    this.labelDataSource = new DataSource(option.label ?? '');
    this.tagDataSource = new DataSource(option.tag ?? 'unknown');
    this.textureReleasedDataSource = new DataSource(false);
    this.smartTextureInfoDataSource = useSmartTextureInfo(
      this.labelDataSource.subscribe,
      this.tagDataSource.subscribe,
      this.textureReleasedDataSource.subscribe,
    );
    this.smartTextureInfoController = this.smartTextureInfoDataSource(this.updateTexture);
    this.updateTexture(this.smartTextureInfoController.getter());
    this.eventTarget = useEventTarget();
    if (this.autoReleaseTexture) {
      this.eventTarget.on(CHECK_SMART_TEXTURE_RELEASE, this.checkTextureRelease);
    }
  }

  private createTextureFromSmartTextureInfo(smartTextureInfo: SmartTextureInfo) {
    const { url } = smartTextureInfo;
    if (url === undefined) {
      return PIXI.Texture.EMPTY;
    }

    const baseTexture = this.smartTextureRc.acquire(url);

    return new PIXI.Texture(
      baseTexture,
      smartTextureInfo.frame,
      smartTextureInfo.orig,
      smartTextureInfo.trim,
      smartTextureInfo.rotate,
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
    const oldUrl = oldTexture.baseTexture.cacheId;
    const texture = this.createTextureFromSmartTextureInfo(smartTextureInfo);
    super.texture = texture;
    super.texture.on('update', this.onTextureUpdate);
    oldTexture.off('update', this.onTextureUpdate);
    oldTexture.destroy();
    this.smartTextureRc.release(oldUrl);

    const emitUpdate = () => {
      this.emit('textureupdate', {});
    };

    if (texture) {
      // wait for the texture to load
      if (texture.baseTexture.valid) {
        emitUpdate();
      } else {
        texture.once('update', emitUpdate, this);
      }
    }
  };

  private checkTextureRelease = () => {
    this.textureReleasedDataSource.data = !this.worldVisible;
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

  get textureReleased() {
    return this.textureReleasedDataSource.data;
  }

  set textureReleased(value: boolean) {
    if (this.autoReleaseTexture) {
      throw new Error('This smart sprite automatically release texture, textureReleased should not be manually set');
    }
    this.textureReleasedDataSource.data = value;
  }

  destroy(...param: Parameters<typeof PIXI.Sprite.prototype.destroy>) {
    this.textureReleasedDataSource.data = true;
    this.smartTextureInfoController.unsubscribe();
    if (this.autoReleaseTexture) {
      this.eventTarget.off(CHECK_SMART_TEXTURE_RELEASE, this.checkTextureRelease);
    }
    this.updateTexture({});
    super.destroy(...param);
  }
}
