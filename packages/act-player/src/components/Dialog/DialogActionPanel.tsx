import cn from 'classnames';
import { styled, useStyletron } from 'baseui';
import type { StyleObject } from 'styletron-react';
import { Button } from 'baseui/button';
import { Block } from 'baseui/block';
import type { DialogActions, DialogActionTriggerResponse } from '@recative/act-protocol';
import React from 'react';

export interface IDialogActionsProps {
  actions:DialogActions,
  onAction?:(action:DialogActionTriggerResponse)=>void
}

const ACTION_BUTTON: StyleObject = {
  boxShadow:
  'rgb(0 0 0 / 20%) 0px 2px 4px -1px, rgb(0 0 0 / 14%) 0px 4px 5px 0px, rgb(0 0 0 / 12%) 0px 1px 10px 0px;',
};

const ActionButton = styled(Button, ACTION_BUTTON);

export const DialogActionPanel: React.FC<IDialogActionsProps> = (props) => {
  const [css] = useStyletron();
  const contentStyles = css({
    pointerEvents: 'auto',
  });

  return (<Block
    key="actions"
    display="grid"
    gridTemplateColumns={`repeat(${props.actions.column}, 1fr)`}
    gridColumnGap="4px"
    padding="6px"
    className={cn(contentStyles)}
  >
    {props.actions.actions.map((action, index) => (
      <ActionButton
        key={index}
        onClick={() => {
          props.onAction?.({
            id: props.actions.id,
            action,
          });
        }}
      >
        {action.label}
      </ActionButton>
    ))}
  </Block>
  );
};
