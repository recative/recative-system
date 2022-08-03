import * as React from 'react';
import cn from 'classnames';
import { Block } from 'baseui/block';
import { useStore } from '@nanostores/react';
import { useStyletron } from 'baseui';

import type { InterfaceExtensionComponent } from '../../types/ExtensionCore';

import { ModuleContainer } from '../Layout/ModuleContainer';

const useStyles = () => {
  const [css] = useStyletron();

  const stageContainerStyles = React.useMemo(() => css({
    height: '100%',
  }), []);

  const elementContainerStyles = React.useMemo(() => css({
    backgroundColor: 'black',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overflowX: 'hidden',
    overflowY: 'hidden',
    pointerEvents: 'auto',
  }), []);

  return { stageContainerStyles, elementContainerStyles };
};

export const CustomizableLoadingLayer: InterfaceExtensionComponent = React.memo((props) => {
  const imageRef = React.useRef<HTMLImageElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { stageContainerStyles, elementContainerStyles } = useStyles();

  const stageEmpty = useStore(props.core.stageEmpty);
  const env = useStore(props.core.additionalEnvVariable);
  const coreState = useStore(props.core.coreState);

  React.useEffect(() => {
    const episodeData = props.core.getEpisodeData();
    if (episodeData === null) {
      // Episode not loaded
      return;
    }
    const imageId = (env as any).loadingImage;
    const videoId = (env as any).loadingVideo;
    if (videoId !== undefined) {
      episodeData.resources.getResourceById(
        videoId,
        {
          category: 'video',
        },
        {
          category: 1e4,
          lang: 1,
        },
      ).then((url) => {
        if (!url) {
          throw new TypeError('Loading video URL not found!');
        }
        videoRef.current!.src = url;
      });
    }
    if (imageId !== undefined) {
      episodeData.resources.getResourceById(
        imageId,
        {
          category: 'texture',
        },
        {
          category: 1e4,
          lang: 1,
        },
      ).then((url) => {
        if (!url) {
          throw new TypeError('Loading image URL not found!');
        }
        imageRef.current!.src = url;
      });
    }
  }, [props.core, coreState, env]);

  return (
    <ModuleContainer>
      <Block className={cn(stageContainerStyles, elementContainerStyles)} display={stageEmpty ? 'block' : 'none'}>
        <img ref={imageRef} />
        <video ref={videoRef} />
      </Block>
    </ModuleContainer>
  );
});
