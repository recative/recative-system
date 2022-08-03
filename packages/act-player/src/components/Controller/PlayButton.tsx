import * as React from 'react';

import { ControllerButton } from './ControllerButton';

import { iconDropShadowStyle } from '../../variables/iconDropShadowStyle';

import { PlayIconOutline } from '../Icon/PlayIconOutline';
import { PauseIconOutline } from '../Icon/PauseIconOutline';

export enum PlayButtonStatus {
  Playing,
  Paused,
}

export interface IPlayButtonProps {
  status: PlayButtonStatus;
  onPlay: () => void;
  onPause: () => void;
}

export const PlayButton: React.FC<IPlayButtonProps> = React.memo((props) => {
  if (props.status === PlayButtonStatus.Playing) {
    return (
      <ControllerButton onClick={props.onPause}>
        <PauseIconOutline width={20} height={20} {...iconDropShadowStyle} />
      </ControllerButton>
    );
  }
  if (props.status === PlayButtonStatus.Paused) {
    return (
      <ControllerButton onClick={props.onPlay}>
        <PlayIconOutline width={20} height={20} {...iconDropShadowStyle} />
      </ControllerButton>
    );
  }
  throw new Error('Unknown Status');
});
