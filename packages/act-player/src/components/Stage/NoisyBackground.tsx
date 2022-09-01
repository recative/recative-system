import * as React from 'react';
import cn from 'classnames';
import { useStyletron } from 'baseui';

import { Block } from 'baseui/block';

import { backgroundImage } from './backgroundImage';

const useBackgroundStyles = () => {
  const [css] = useStyletron();

  const backgroundContainerStyles = React.useMemo(() => css({
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100%',
    height: '100%',
    transform: 'translate(-50%, -50%)',
  }), [css]);

  const backgroundPatternStyles = React.useMemo(() => css({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundImage,
    animationDuration: '200ms',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationFillMode: 'steps',
    animationName: {
      from: {
        backgroundPosition: '0 0',
      },
      to: {
        backgroundPosition: '100% 100%',
      },
    } as unknown as string,
  }), [css]);

  return { backgroundContainerStyles, backgroundPatternStyles };
};

export const NoisyBackground: React.FC = () => {
  const [css] = useStyletron();
  const [resolution, setResolution] = React.useState([0, 0]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { backgroundContainerStyles, backgroundPatternStyles } = useBackgroundStyles();

  const backgroundPositionStyles = React.useMemo(() => css({
    width: `${resolution[0]}px`,
    height: `${resolution[1]}px`,
  }), [css, resolution]);

  const updateResolution = React.useCallback(() => {
    if (!containerRef.current) return;
    const $container = containerRef.current;
    const containerWidth = $container.clientWidth;
    const containerHeight = $container.clientHeight;
    const aspectRatio = 16 / 9;
    if (containerWidth / containerHeight > aspectRatio) {
      setResolution([containerHeight * aspectRatio, containerHeight]);
    } else {
      setResolution([containerWidth, containerWidth / aspectRatio]);
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener('resize', updateResolution);

    return () => window.removeEventListener('resize', updateResolution);
  }, [updateResolution]);

  React.useEffect(() => {
    setTimeout(updateResolution, 0);
  }, [updateResolution]);

  return (
    <Block ref={containerRef} className={backgroundContainerStyles}>
        <Block className={cn(backgroundPatternStyles, backgroundPositionStyles)}/>
    </Block>
  );
};
