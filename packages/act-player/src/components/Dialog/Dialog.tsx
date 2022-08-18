import cn from 'classnames';
import { useStore } from '@nanostores/react';
import { useStyletron } from 'baseui';
import type { StyleObject } from 'styletron-react';

import { Block } from 'baseui/block';
import { ParagraphSmall } from 'baseui/typography';

import { DialogActionTriggerResponse } from '@recative/act-protocol';
import React from 'react';
import { ModuleContainer } from '../Layout/ModuleContainer';

import { useRandomId } from '../../hooks/useRandomId';
import type { InterfaceExtensionComponent } from '../../types/ExtensionCore';

import { DialogDirection, DialogUnit } from './DialogUnit';
import { DialogActionPanel } from './DialogActionPanel';

const DIALOG_CONTAINER_STYLE: StyleObject = {
  height: 'calc(100% - 44px)',
  display: 'flex',
  justifyContent: 'flex-end',
};

export const Dialog: InterfaceExtensionComponent = (props) => {
  const [css] = useStyletron();

  const dialogVisible = useStore(props.core.dialogManager.dialogVisible);
  const dialogMessage = useStore(props.core.dialogManager.dialogMessageList);
  const dialogActions = useStore(props.core.dialogManager.dialogActions);

  const controllerContainerStyles = cn(css(DIALOG_CONTAINER_STYLE));
  const debugStyles = css({
    overflowY: 'auto',
  });

  const hackedClassName = useRandomId();

  const handleDialogAction = React.useCallback((action:DialogActionTriggerResponse) => {
    props.core.dialogManager.triggerDialogAction(action);
    props.core.dialogManager.dialogActions.set(null);
    props.core.dialogManager.sendDialogMessage([{
      type: 'text',
      direction: DialogDirection.Right,
      content: action.action.label,
    }]);
  }, [props.core]);

  return (
    <ModuleContainer
      id="dialogContainer"
      key="dialog"
      className={cn(controllerContainerStyles)}
    >
      <style>
        {`
          .${hackedClassName} {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .${hackedClassName}::-webkit-scrollbar {
            display: none;
          }

          .${hackedClassName}::-webkit-scrollbar {
            width: 5px;
            height: 8px;
            background-color: #aaa;
          }
        `}
      </style>
      {dialogVisible && (
        <Block
          width="100%"
          maxWidth="280px"
          padding="6px"
          display="flex"
          flexDirection="column-reverse"
          className={cn(debugStyles, hackedClassName)}
        >
          {dialogActions !== null && (
            <DialogActionPanel actions={dialogActions} onAction={handleDialogAction}/>
          )}
          {dialogMessage.accumulated.length <= 0
            && (<DialogUnit
              key="placeholder"
              direction={DialogDirection.Left}
            >
              <ParagraphSmall color="black">Nothing to see here for now...</ParagraphSmall>
            </DialogUnit>)}
          {dialogMessage.accumulated.concat([]).reverse().map((dialogUnit, index) => (
            <DialogUnit
              key={index}
              direction={dialogUnit.direction}
              animationDelay={index * 50}
            >
              {
                (dialogUnit.type === 'text')
                && (<ParagraphSmall color="black">{dialogUnit.content}</ParagraphSmall>)
              }

              {
                (dialogUnit.type === 'image')
                && (<img src={dialogUnit.src} alt="Alt message"/>)
              }
            </DialogUnit>
          ))}
        </Block>
      )}
    </ModuleContainer>
  );
};
