import * as React from 'react';
import { useStyletron } from 'baseui';

import { Block } from 'baseui/block';
import { LabelXSmall } from 'baseui/typography';
import { ClearLottie } from '../ClearLottie/ClearLottie';

import { Oops } from '../Stage/Oops';
import { NoisyBackground } from '../Stage/NoisyBackground';

import { errorAnimation } from '../Stage/errorAnimation';

const useStyles = () => {
  const [css] = useStyletron();

  const containerStyles = React.useMemo(
    () => css({
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      position: 'absolute',
    }),
    [],
  );

  const loaderStyles = React.useMemo(
    () => css({
      width: '100px',
      height: '100px',

      display: 'inline-block',
    }),
    [],
  );

  const textStyles = React.useMemo(
    () => css({
      color: 'white',
    }),
    [],
  );

  return { containerStyles, loaderStyles, textStyles };
};

interface IErrorProps {
  children?: React.ReactNode;
}

export const Error: React.FC<IErrorProps> = ({ children }) => {
  const { containerStyles, loaderStyles, textStyles } = useStyles();

  return (
    <Block
      width="100%"
      height="100%"
      position="relative"
      backgroundColor="black"
    >
      <NoisyBackground />
      <Block className={containerStyles} display="flex" alignItems="center">
        <Block marginRight="16px">
          <ClearLottie
            className={loaderStyles}
            animationData={errorAnimation}
            loop={true}
          />
        </Block>
        <Block className={textStyles}>
          <Block>
            <Oops width={160} />
          </Block>
          <Block marginTop="8px">
            <LabelXSmall>{children}</LabelXSmall>
          </Block>
        </Block>
      </Block>
    </Block>
  );
};
