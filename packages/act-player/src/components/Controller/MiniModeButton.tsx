import * as React from 'react';

import { ControllerButton } from './ControllerButton';

import { iconDropShadowStyle } from '../../variables/iconDropShadowStyle';

import { MiniModeIconOutline } from '../Icon/MiniModeIconOutline';
import { ExitMiniModeIconOutline } from '../Icon/ExitMiniModeIconOutline';

export enum MiniModeButtonStatus {
  On,
  Off,
}

export interface IMiniModeButtonProps {
  status: MiniModeButtonStatus;
  onEnterMiniMode: () => void;
  onExitMiniMode: () => void;
}

export const MiniModeButton: React.FC<IMiniModeButtonProps> = React.memo((props) => {
  if (props.status === MiniModeButtonStatus.On) {
    return (
      <ControllerButton onClick={props.onExitMiniMode}>
        <ExitMiniModeIconOutline width={20} height={20} {...iconDropShadowStyle} />
      </ControllerButton>
    );
  }
  if (props.status === MiniModeButtonStatus.Off) {
    return (
      <ControllerButton onClick={props.onEnterMiniMode}>
        <MiniModeIconOutline width={20} height={20} {...iconDropShadowStyle} />
      </ControllerButton>
    );
  }
  throw new Error('Unknown Status');
});
