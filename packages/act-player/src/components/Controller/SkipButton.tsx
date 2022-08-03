import * as React from 'react';

import { ControllerButton } from './ControllerButton';

import { iconDropShadowStyle } from '../../variables/iconDropShadowStyle';

import { SkipSegmentIconOutline } from '../Icon/SkipSegmentIconOutline';

export interface ISkipButtonProps {
}

export const SkipButton: React.FC<ISkipButtonProps> = React.memo(() => {
  return (
    <ControllerButton>
        <SkipSegmentIconOutline width={20} height={20} {...iconDropShadowStyle} />
    </ControllerButton>
  );
});
