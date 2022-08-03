import * as React from 'react';

import { ControllerButton } from './ControllerButton';

import { iconDropShadowStyle } from '../../variables/iconDropShadowStyle';

import { FullScreenIconOutline } from '../Icon/FullScreenIconOutline';
import { ExitFullScreenIconOutline } from '../Icon/ExitFullScreenIconOutline';

export enum FullScreenSwitcherStatus {
  On,
  Off,
}

export interface IFullScreenSwitcherProps {
  status: FullScreenSwitcherStatus;
  onEnterFullScreenMode: () => void;
  onExitFullScreenMode: () => void;
}

export const FullScreenSwitcher: React.FC<IFullScreenSwitcherProps> = React.memo((
  props,
) => {
  if (props.status === FullScreenSwitcherStatus.On) {
    return (
      <ControllerButton onClick={props.onExitFullScreenMode}>
        <ExitFullScreenIconOutline width={20} height={20} {...iconDropShadowStyle} />
      </ControllerButton>
    );
  }
  if (props.status === FullScreenSwitcherStatus.Off) {
    return (
      <ControllerButton onClick={props.onEnterFullScreenMode}>
        <FullScreenIconOutline width={20} height={20} {...iconDropShadowStyle} />
      </ControllerButton>
    );
  }
  throw new Error('Unknown Status');
});
