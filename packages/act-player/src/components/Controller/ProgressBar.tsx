import * as React from 'react';
import cn from 'classnames';
import { useHover } from 'react-use';
import { useStyletron } from 'baseui';

import ReactSlider from 'react-slider';
import { Block } from 'baseui/block';

import { useRandomId } from '../../hooks/useRandomId';

const SLIDER_HEIGHT = 4;
const TRACK_HEIGHT = 10;
const MARK_HEIGHT = 10;
const MARK_WIDTH = 2;
const THUMB_WIDTH = 20;
const THUMB_HEIGHT = 20;

interface IProgressbarProps {
  progress: number;
  durations: number[];
  miniMode: boolean;
  onSeek: (progress: number) => void;
}

const useStyles = (miniMode: boolean) => {
  const [css, theme] = useStyletron();

  const rootContainerStyle = React.useMemo(
    () => css({
      top: '12px',
      paddingTop: '12px',
      paddingBottom: '12px',
      position: 'relative',
      pointerEvents: 'auto',
    } as const),
    [],
  );

  const sliderStyles = React.useMemo(
    () => css({
      top: miniMode
        ? `${0 - TRACK_HEIGHT / 4}px`
        : `${0 - TRACK_HEIGHT / 8}px`,
      width: '100%',
      height: `${SLIDER_HEIGHT}px`,
      position: 'relative',
      pointerEvents: 'auto',
    } as const),
    [miniMode],
  );

  const thumbStyles = React.useMemo(
    () => css({
      top: `${0 - Math.abs(THUMB_HEIGHT - TRACK_HEIGHT) / 2}px`,
      width: miniMode ? `${TRACK_HEIGHT}px` : `${THUMB_WIDTH}px`,
      height: miniMode ? `${TRACK_HEIGHT}px` : `${THUMB_HEIGHT}px`,
      backgroundColor: theme.colors.backgroundAccent,
      borderRadius: miniMode ? '0' : '50%',
      cursor: 'pointer',
      boxSizing: 'border-box',
      transform: miniMode
        ? 'scale(0) translateY(50%)'
        : 'scale(0) translateX(-50%)',
      transition: `transform ${theme.animation.timing300}`,
      transformOrigin: 'left center',
      position: 'absolute',
    } as const),
    [miniMode, theme.colors.backgroundAccent, theme.animation.timing300],
  );

  const thumbHoverStyles = React.useMemo(
    () => css({ transform: 'scaleY(1) translateX(-50%)' }),
    [],
  );

  const trackStyles = React.useMemo(
    () => css({
      height: `${TRACK_HEIGHT}px`,
      backgroundColor: theme.colors.accent200,
      transform: 'scaleY(0.3)',
      transition: `transform ${theme.animation.timing300}`,
    } as const),
    [theme.colors.accent200, theme.animation.timing300],
  );

  const trackHoverStyles = React.useMemo(
    () => css({ transform: 'scaleY(1)' }),
    [],
  );

  const markStyles = React.useMemo(
    () => css({
      top: `${0 - Math.abs(MARK_HEIGHT - TRACK_HEIGHT) / 2}px`,
      height: `${MARK_HEIGHT}px`,
      width: `${MARK_WIDTH}px`,
      backgroundColor: theme.colors.backgroundAccent,
      transform: 'scaleY(0.5)',
      transition: `transform ${theme.animation.timing300}`,
    } as const),
    [theme.colors.backgroundAccent, theme.animation.timing300],
  );

  const markHoverStyles = React.useMemo(
    () => css({ transform: 'scaleY(1.05)' }),
    [],
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
    rootContainerStyle,
    sliderStyles,
    thumbStyles,
    thumbHoverStyles,
    trackStyles,
    trackHoverStyles,
    markStyles,
    markHoverStyles,
    trackClassName,
    trackStyleElement,
  };
};

const PROGRESS_ARIA_LABEL = 'Progress' as const;

export const ProgressBar: React.FC<IProgressbarProps> = React.memo((props) => {
  const {
    rootContainerStyle,
    sliderStyles,
    thumbStyles,
    thumbHoverStyles,
    trackStyles,
    trackHoverStyles,
    markStyles,
    markHoverStyles,
    trackClassName,
    trackStyleElement,
  } = useStyles(props.miniMode);

  const marks = React.useMemo(() => {
    let accumulated = 0;
    const total = props.durations
      .filter((duration) => duration !== Infinity)
      .reduce((a, b) => a + b, 0);
    const result: number[] = [];

    if (total !== 0) {
      props.durations.forEach((duration) => {
        if (duration === Infinity) {
          result.push((accumulated / total) * 100);
        } else {
          accumulated += duration;
        }
      });
    }
    return result;
  }, [props.durations]);

  const sliderElement = React.useCallback(
    (hover: boolean) => {
      if (!props.durations.length) return (<Block position="relative" />);

      return (
        <Block className={rootContainerStyle}>
          <ReactSlider
            className={sliderStyles}
            trackClassName={trackClassName}
            value={props.progress}
            ariaLabel={PROGRESS_ARIA_LABEL}
            step={1e-8}
            marks={marks}
            onAfterChange={(progress) => props.onSeek(progress)}
            renderThumb={({ className, ...thumbProps }) => (
              <div
                className={cn(
                  className,
                  { [thumbHoverStyles]: hover },
                  thumbStyles,
                )}
                {...thumbProps}
              />
            )}
            renderMark={({ className, ...markProps }) => (
              <div
                className={cn(
                  className,
                  { [markHoverStyles]: hover },
                  markStyles,
                )}
                {...markProps as any}
              />
            )}
            renderTrack={({ className, ...trackProps }) => (
              <div
              className={cn(
                trackStyles,
                { [trackHoverStyles]: hover },
                className,
              )}
                {...trackProps}
                />
            )}
          />
          {trackStyleElement}
        </Block>
      );
    },
    [marks, props.progress],
  );

  const [component] = useHover(sliderElement);

  return component;
});
