import * as React from 'react';
import { merge } from 'lodash';

import { Button } from 'baseui/button';
import type { ButtonProps } from 'baseui/button';

export const IconButtonOverrides = {
  StartEnhancer: { style: { marginRight: '0' } },
};

export interface IButtonBlockedProps {
  startEnhancer?: never;
}

export interface IIconButtonProps
  extends Omit<ButtonProps, keyof IButtonBlockedProps>,
  IButtonBlockedProps {}

const InternalIconButton: React.ForwardRefRenderFunction<
HTMLButtonElement,
IIconButtonProps
> = ({ children, overrides, ...props }, ref) => {
  const startEnhancer = React.useCallback(() => children, [children]);
  const internalOverrides = React.useMemo(
    () => merge({}, IconButtonOverrides, overrides),
    [overrides],
  );

  return (
    <Button
      ref={ref}
      startEnhancer={startEnhancer as any}
      overrides={internalOverrides}
      {...props}
    />
  );
};

export const IconButton = React.forwardRef<HTMLButtonElement, IIconButtonProps>(
  InternalIconButton,
);
