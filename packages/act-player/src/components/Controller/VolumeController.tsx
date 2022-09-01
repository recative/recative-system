import * as React from 'react';
import cn from 'classnames';
import { useStyletron } from 'baseui';

import ReactSlider from 'react-slider';
import ReactTooltip from 'react-tooltip';
import { Block } from 'baseui/block';

import { VolumeLevel0IconOutline } from '../Icon/VolumeLevel0IconOutline';
import { VolumeLevel1IconOutline } from '../Icon/VolumeLevel1IconOutline';
import { VolumeLevel2IconOutline } from '../Icon/VolumeLevel2IconOutline';
import { VolumeLevel3IconOutline } from '../Icon/VolumeLevel3IconOutline';

import { useRandomId } from '../../hooks/useRandomId';
import { iconDropShadowStyle } from '../../variables/iconDropShadowStyle';

import { ControllerButton } from './ControllerButton';

export interface IVolumeButtonProps {
  // This value should between 0 and 1.
  volume: number;
  onChange: (x: number) => void;
}

const SLIDER_HEIGHT = 120;
const SLIDER_PADDING = 4;
const TRACK_WIDTH = 4;
const THUMB_WIDTH = 14;

const useStyles = () => {
  const [css, theme] = useStyletron();

  const mainStyles = React.useMemo(
    () => css({
      '@media (max-width: 480px)': {
        display: 'none',
      },
    }),
    [css],
  );

  const sliderStyles = React.useMemo(
    () => css({
      left: `${0 - TRACK_WIDTH / 2}px`,
      height: `${SLIDER_HEIGHT}px`,
      position: 'relative',
    }),
    [css],
  );

  const thumbStyles = React.useMemo(
    () => css({
      left: `${0 - Math.abs(THUMB_WIDTH - TRACK_WIDTH) / 2}px`,
      width: `${THUMB_WIDTH}px`,
      height: `${THUMB_WIDTH}px`,
      borderRadius: '50%',
      backgroundColor: theme.colors.backgroundAccent,
      cursor: 'pointer',
      boxSizing: 'border-box',
    }),
    [css, theme.colors.backgroundAccent],
  );

  const trackStyles = React.useMemo(
    () => css({
      width: `${TRACK_WIDTH}px`,
      backgroundColor: theme.colors.accent200,
    }),
    [css, theme.colors.accent200],
  );

  const trackClassName = useRandomId();

  const trackStyleElement = React.useMemo(
    () => (
      <style>
        {`
          .${trackClassName}-0 {
            background-color: ${theme.colors.backgroundAccent};
          }
        `}
      </style>
    ),
    [trackClassName, theme.colors.backgroundAccent],
  );

  return {
    mainStyles,
    sliderStyles,
    thumbStyles,
    trackStyles,
    trackClassName,
    trackStyleElement,
  };
};

const VOLUME_ARIA_LABEL = ['Volume'] as const;

export const VolumeController: React.FC<IVolumeButtonProps> = React.memo((props) => {
  const {
    mainStyles,
    sliderStyles,
    thumbStyles,
    trackStyles,
    trackClassName,
    trackStyleElement,
  } = useStyles();

  const controllerId = useRandomId('volume-controller');

  return (
    <Block className={mainStyles}>
      <ControllerButton data-tip={controllerId} data-for={controllerId}>
        {props.volume === 0 && (
          <VolumeLevel0IconOutline width={20} height={20} {...iconDropShadowStyle} />
        )}
        {props.volume > 0 && props.volume < 0.3 && (
          <VolumeLevel1IconOutline width={20} height={20} {...iconDropShadowStyle} />
        )}
        {props.volume >= 0.3 && props.volume < 0.6 && (
          <VolumeLevel2IconOutline width={20} height={20} {...iconDropShadowStyle} />
        )}
        {props.volume >= 0.6 && props.volume <= 1 && (
          <VolumeLevel3IconOutline width={20} height={20} {...iconDropShadowStyle} />
        )}
      </ControllerButton>
      <ReactTooltip
        id={controllerId}
        getContent={() => (
          <Block height={`${SLIDER_HEIGHT}px`} padding={`${SLIDER_PADDING}px`}>
            <ReactSlider
              invert
              className={sliderStyles}
              thumbClassName={thumbStyles}
              trackClassName={trackClassName}
              value={[props.volume * 100]}
              ariaLabel={VOLUME_ARIA_LABEL}
              orientation="vertical"
              onChange={(event) => {
                props.onChange(event as unknown as number / 100);
              }}
              renderTrack={({ className, ...trackProps }) => (
                <div className={cn(className, trackStyles)} {...trackProps} />
              )}
            />
          </Block>
        )}
        clickable
        type="dark"
        effect="solid"
        delayShow={0}
        delayHide={800}
        delayUpdate={800}
      />
      {trackStyleElement}
    </Block>
  );
});
