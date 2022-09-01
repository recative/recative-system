import * as React from 'react';
import cn from 'classnames';

import { useStyletron } from 'baseui';
import type { StyleObject } from 'styletron-react';

import { Block } from 'baseui/block';

export enum DialogDirection {
  Left,
  Right,
}

export interface IDialogUnitProps {
  direction: DialogDirection;
  animationDelay?: number;
  children?: React.ReactNode;
}

const DIALOG_CORNER = '8px';

const LEFT_DIRECTION_DIALOG: StyleObject = {
  backgroundColor: 'white',
  borderTopLeftRadius: DIALOG_CORNER,
  borderTopRightRadius: DIALOG_CORNER,
  borderBottomLeftRadius: '0',
  borderBottomRightRadius: DIALOG_CORNER,
};

const RIGHT_DIRECTION_DIALOG: StyleObject = {
  backgroundColor: 'white',
  borderTopLeftRadius: DIALOG_CORNER,
  borderTopRightRadius: DIALOG_CORNER,
  borderBottomLeftRadius: DIALOG_CORNER,
  borderBottomRightRadius: '0',
};

const DIALOG_UNIT: StyleObject = {
  pointerEvents: 'auto',
  opacity: 0,
  visibility: 'hidden',
  boxShadow:
  'rgb(0 0 0 / 20%) 0px 2px 4px -1px, rgb(0 0 0 / 14%) 0px 4px 5px 0px, rgb(0 0 0 / 12%) 0px 1px 10px 0px;',
  animationFillMode: 'forwards',
  animationName: {
    from: {
      transform: 'translateY(24px)',
      opacity: 0,
      visibility: 'hidden',
    },
    to: {
      transform: 'translateY(0)',
      opacity: 1,
      visibility: 'visible',
    },
  } as unknown as string,
};

export const DialogUnit: React.FC<IDialogUnitProps> = (props) => {
  const [css, theme] = useStyletron();

  const blockBodyStyle = css(DIALOG_UNIT);
  const blockBodyCornerStyle = css(
    props.direction === DialogDirection.Left
      ? LEFT_DIRECTION_DIALOG
      : RIGHT_DIRECTION_DIALOG,
  );

  const animationStyle = React.useMemo(
    () => css({
      animationDuration: theme.animation.timing300,
      animationDelay: `${props.animationDelay}ms`,
    }),
    [css, props.animationDelay, theme.animation.timing300],
  );

  return (
    <Block
      padding="6px"
      display="flex"
      justifyContent={
        props.direction === DialogDirection.Left ? 'flex-start' : 'flex-end'
      }
    >
      <Block
        className={cn(blockBodyCornerStyle, blockBodyStyle, animationStyle)}
        maxWidth="80%"
        padding="8px 12px"
      >
        {props.children}
      </Block>
    </Block>
  );
};
