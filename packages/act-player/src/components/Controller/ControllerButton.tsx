import * as React from 'react';

import { KIND } from 'baseui/button';
import type { ButtonOverrides } from 'baseui/button';

import { IconButton } from '../IconButton/IconButton';
import type { IIconButtonProps } from '../IconButton/IconButton';

export const ControllerButtonOverrides: ButtonOverrides = {
  BaseButton: {
    style: ({ $theme }) => ({
      paddingTop: '12px',
      paddingRight: '12px',
      paddingBottom: '12px',
      paddingLeft: '12px',
      color: '#fff',
      filter: 'drop-shadow(0px 3px 3px -2px rgb(255 0 0 / 20%))',
      transitionProperty: 'background, transform',
      transitionDuration: $theme.animation.timing200,

      ':hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
      },

      ':active': {
        backgroundColor: 'rgba(0, 0, 0, 0)',
        transform: 'scale(0.9)',
      },
    }),
  },
};

export interface IIconButtonBlockedProps {
  kind?: never;
  overrides?: never;
}

export interface IControllerButtonProps
  extends Omit<IIconButtonProps, keyof IIconButtonBlockedProps>,
  IIconButtonBlockedProps {}

const InternalControllerButton: React.ForwardRefRenderFunction<
HTMLButtonElement,
IControllerButtonProps
> = ({ overrides, ...props }, ref) => (
  <IconButton
    ref={ref}
    kind={KIND.tertiary}
    overrides={ControllerButtonOverrides}
    {...props}
  />
);

export const ControllerButton = React.forwardRef(InternalControllerButton);
