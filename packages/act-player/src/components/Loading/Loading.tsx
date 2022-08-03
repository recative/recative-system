import * as React from 'react';
import { useStyletron } from 'baseui';

import { Block } from 'baseui/block';
import { ClearLottie } from '../ClearLottie/ClearLottie';

import { loadingAnimation } from './loadingAnimation';

import { NoisyBackground } from '../Stage/NoisyBackground';

const useStyles = () => {
  const [css] = useStyletron();

  const loaderStyles = React.useMemo(() => css({
    top: '50%',
    left: '50%',
    width: '120px',
    height: '120px',
    transform: 'translate(-50%, -50%)',
    position: 'absolute',
    display: 'inline-block',
  }), []);
  return { loaderStyles };
};

export const Loading: React.FC = () => {
  const { loaderStyles } = useStyles();

  return (
    <Block width="100%" height="100%" position="relative" backgroundColor="black">
        <NoisyBackground />
        <ClearLottie className={loaderStyles} animationData={loadingAnimation} loop={true} />
    </Block>
  );
};
