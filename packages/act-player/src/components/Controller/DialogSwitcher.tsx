import * as React from 'react';

import { ControllerButton } from './ControllerButton';

import { iconDropShadowStyle } from '../../variables/iconDropShadowStyle';

import { ChatIconOutline } from '../Icon/ChatIconOutline';

export enum DialogSwitcherStatus {
  Open,
  Closed,
}

export interface IDialogSwitcherProps {
  status: DialogSwitcherStatus;
  onOpen: () => void;
  onClose: () => void;
}

export const DialogSwitcher: React.FC<IDialogSwitcherProps> = React.memo((props) => {
  if (props.status === DialogSwitcherStatus.Open) {
    return (
      <ControllerButton onClick={props.onClose}>
        <ChatIconOutline width={20} height={20} {...iconDropShadowStyle} />
      </ControllerButton>
    );
  }
  if (props.status === DialogSwitcherStatus.Closed) {
    return (
      <ControllerButton onClick={props.onOpen}>
        <ChatIconOutline width={20} height={20} {...iconDropShadowStyle} />
      </ControllerButton>
    );
  }
  throw new Error('Unknown Status');
});
