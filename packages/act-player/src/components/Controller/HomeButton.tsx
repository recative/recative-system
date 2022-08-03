import * as React from 'react';
import { useStyletron } from 'baseui';

import { Block } from 'baseui/block';
import { ControllerButton } from './ControllerButton';

import { iconDropShadowStyle } from '../../variables/iconDropShadowStyle';

import { HomeIconOutline } from '../Icon/HomeIconOutline';

export interface IHomeButtonProps {
  onClick: () => void;
}

export const HomeButton: React.FC<IHomeButtonProps> = React.memo((props) => {
  const [css] = useStyletron();
  const mainStyles = React.useMemo(
    () => css({
      '@media (max-width: 432px)': {
        display: 'none',
      },
    }),
    [],
  );

  return (
    <Block className={mainStyles}>
      <ControllerButton onClick={props.onClick}>
          <HomeIconOutline width={20} height={20} {...iconDropShadowStyle} />
      </ControllerButton>
    </Block>
  );
});
