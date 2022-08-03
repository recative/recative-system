import * as React from 'react';
import { useStyletron } from 'baseui';

import { Block } from 'baseui/block';

import { ClearLottie } from '../ClearLottie/ClearLottie';
import { loadingAnimation } from './loadingAnimation';

const useStyles = () => {
  const [css] = useStyletron();

  const loaderStyles = React.useMemo(
    () => css({
      top: '50%',
      left: '50%',
      width: '120px',
      height: '120px',
      transform: 'translate(-50%, -50%)',
      position: 'absolute',
      display: 'inline-block',
    }),
    [],
  );
  return { loaderStyles };
};

interface IBufferingComponentProps {
  loadingComponent?: React.FC<{}>;
}

export const Buffering: React.FC<IBufferingComponentProps> = (props) => {
  const { loaderStyles } = useStyles();

  const LoadingComponent = props.loadingComponent;
  return (
    <Block
      width="100%"
      height="100%"
      position="relative"
      backgroundColor="rgba(0,0,0,0.5)"
    >
      {LoadingComponent ? (
        <LoadingComponent />
      ) : (
        <ClearLottie
          className={loaderStyles}
          animationData={loadingAnimation}
        />
      )}
    </Block>
  );
};
