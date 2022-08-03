import * as React from 'react';
import { styled } from 'baseui';

import ReactTooltip from 'react-tooltip';
import ClickAwayListener from 'react-click-away-listener';
import { Block } from 'baseui/block';
import { Button, SIZE, KIND } from 'baseui/button';
import type { ButtonOverrides } from 'baseui/button';

import { Resolution480IconOutline } from '../Icon/Resolution480IconOutline';
import { Resolution720IconOutline } from '../Icon/Resolution720IconOutline';
import { Resolution1080IconOutline } from '../Icon/Resolution1080IconOutline';

import { useRandomId } from '../../hooks/useRandomId';
import { iconDropShadowStyle } from '../../variables/iconDropShadowStyle';

import { ControllerButton } from './ControllerButton';

export interface IResolutionSwitcherProps {
  // This value should between 0 and 1.
  width: number;
  height: number;
  onChange: (width: number, height: number) => void;
}

const buttonOverrides: ButtonOverrides = {
  BaseButton: {
    style: {
      width: '100%',
      paddingLeft: '16px',
      paddingRight: '16px',
    },
  },
};

const ResolutionList = styled('ul', {
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

const ResolutionListItem = styled('li', {
  margin: '0 -16px',
});

export const ResolutionSwitcher: React.FC<IResolutionSwitcherProps> = React.memo((
  props,
) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const controllerId = useRandomId('resolution-controller');

  const handleClickAway = React.useCallback(() => {
    ReactTooltip.hide(buttonRef.current!);
  }, []);

  return (
    <Block>
      <ControllerButton
        ref={buttonRef}
        data-tip={controllerId}
        data-for={controllerId}
        data-event="click"
      >
        {props.height === 480 && (
          <Resolution480IconOutline width={20} height={20} {...iconDropShadowStyle} />
        )}
        {props.height === 720 && (
          <Resolution720IconOutline width={20} height={20} {...iconDropShadowStyle} />
        )}
        {props.height === 1080 && (
          <Resolution1080IconOutline width={20} height={20} {...iconDropShadowStyle} />
        )}
      </ControllerButton>
      <ReactTooltip
        id={controllerId}
        getContent={() => (
          <ClickAwayListener onClickAway={handleClickAway} onClick={handleClickAway}>
            <ResolutionList>
              <ResolutionListItem>
                <Button
                  onClick={() => props.onChange(853, 480)}
                  size={SIZE.mini}
                  kind={KIND.tertiary}
                  overrides={buttonOverrides}
                >
                  480P
                </Button>
              </ResolutionListItem>
              <ResolutionListItem>
                <Button
                  onClick={() => props.onChange(1280, 720)}
                  size={SIZE.mini}
                  kind={KIND.tertiary}
                  overrides={buttonOverrides}
                >
                  720P
                </Button>
              </ResolutionListItem>
              <ResolutionListItem>
                <Button
                  onClick={() => props.onChange(1920, 1080)}
                  size={SIZE.mini}
                  kind={KIND.tertiary}
                  overrides={buttonOverrides}
                >
                  1080P
                </Button>
              </ResolutionListItem>
            </ResolutionList>
          </ClickAwayListener>
        )}
        clickable
        type="dark"
        effect="solid"
        delayShow={0}
        delayHide={800}
        delayUpdate={800}
      />
    </Block>
  );
});
