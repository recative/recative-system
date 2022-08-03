import * as PIXI from 'pixi.js-legacy';
import * as THREE from 'three';

import type { ResourceEntry } from '@recative/smart-resource';

import { Receiver } from '../core/Receiver';
import { AtomDefinition } from '../core/AtomStore';

import { useSelector } from '../core/DataSource';
import { useCallback, useStore } from './baseHooks';
import { useSmartResourceDataSource } from './smartResourceHooks';
import { useResourceManagerResourceDataSource } from './resourceManagerHooks';

export const useI18FixerDataSource = (config: ResourceEntry<string>[]) => {
  const configUrlDataSource = useSmartResourceDataSource(config);
  const textureDataSource = useSelector(
    configUrlDataSource,
    (url: string) => PIXI.Texture.from(url),
  );

  const connect = useCallback((x: PIXI.Sprite) => {
    Receiver(x).connect('texture', textureDataSource);
  });

  return { textureDataSource, connect };
};

export const useResourceManagerI18FixerDataSource = (label: string) => {
  const configUrlDataSource = useResourceManagerResourceDataSource(label);
  const textureDataSource = useSelector(
    configUrlDataSource,
    (url) => (url ? PIXI.Texture.from(url as string) : null),
  );

  const connect = useCallback((x: PIXI.Sprite) => {
    const receiver = {
      get texture() {
        return x.texture;
      },
      set texture(texture: PIXI.Texture | null) {
        if (texture) {
          x.texture = texture;
        }
      },
    };
    Receiver(receiver).connect('texture', textureDataSource);
  });

  return { textureDataSource, connect };
};

/** i18n for PIXI AnimatedSprite */
export const useResourceManagerI18FixerDataSourceAnimatedSprite = (
  labels: string[],
) => {
  const connect = useCallback((x: PIXI.AnimatedSprite) => {
    labels.forEach((label, i) => {
      const receiver = {
        set texture(texture: PIXI.Texture | null) {
          if (texture) {
            x.textures[i] = texture;
          }
        },
      };
      const configUrlDataSource = useResourceManagerResourceDataSource(label);
      const textureDataSource = useSelector(
        configUrlDataSource,
        (url) => (url ? PIXI.Texture.from(url as string) : null),
      );
      Receiver(receiver).connect('texture', textureDataSource);
    });
  });

  return { connect };
};

/** i18n for PIXI normal Sprite */
export const useResourceManagerI18FixerDataSourceTexture = (label: string) => {
  let texture = PIXI.Texture.EMPTY;

  const configUrlDataSource = useResourceManagerResourceDataSource(label);

  configUrlDataSource((url) => {
    texture = url ? PIXI.Texture.from(url) : PIXI.Texture.EMPTY;
  });

  return new Proxy(
    {},
    {
      set(obj, prop, value) {
        Reflect.set(texture, prop, value);
        return true;
      },
      get(obj, prop) {
        return Reflect.get(texture, prop);
      },
    },
  ) as PIXI.Texture;
};

/** i18n for Three Texture */
export const useResourceManagerI18FixerDataSourceThreeTexture = (
  label: string,
) => {
  const texture: THREE.Texture = new THREE.Texture(new Image());

  const configUrlDataSource = useResourceManagerResourceDataSource(label);

  configUrlDataSource((url) => {
    texture.image.src = url;
    texture.needsUpdate = true;
  });

  return texture;
};

/** i18n for PIXI normal Sprite with custom tag */

type CustomSprite = { sprite: PIXI.Sprite; setTag: (v: string) => void };

export const useResourceManagerI18FixerCustomSprite = (
  label: string,
  initializedTag: string,
): CustomSprite => {
  const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);

  const CUSTOM_TAG = AtomDefinition<string>(initializedTag);
  const [, setTag, registerTagUpdate] = useStore(CUSTOM_TAG);
  const configUrlDataSource = useResourceManagerResourceDataSource(
    label,
    'png',
    registerTagUpdate,
  );

  configUrlDataSource((url) => {
    sprite.texture = url ? PIXI.Texture.from(url) : PIXI.Texture.EMPTY;
  });

  return { sprite, setTag };
};
