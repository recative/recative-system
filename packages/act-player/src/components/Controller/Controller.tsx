import * as React from 'react';
import cn from 'classnames';
import { useStore } from '@nanostores/react';
import { useStyletron } from 'baseui';

import type { EpisodeCore } from '@recative/core-manager';

import { Block } from 'baseui/block';

import { ModuleContainer } from '../Layout/ModuleContainer';
import { PlayButton, PlayButtonStatus } from './PlayButton';
import { HomeButton } from './HomeButton';
import { VolumeController } from './VolumeController';
import { MiniModeButton, MiniModeButtonStatus } from './MiniModeButton';
import { LanguageButton } from './LanguageButton';
import { DialogSwitcher, DialogSwitcherStatus } from './DialogSwitcher';
import { ResolutionSwitcher } from './ResolutionSwitcher';
import { ProgressBar } from './ProgressBar';
import {
  FullScreenSwitcher,
  FullScreenSwitcherStatus,
} from './FullScreenSwitcher';

const formatTime = (x: number) => {
  return new Date(x).toISOString().slice(14, 19);
};

const useStyles = () => {
  const [css, theme] = useStyletron();

  const controllerContainerStyles = React.useMemo(
    () => css({
      display: 'flex',
      justifyContent: 'flex-end',
      flexDirection: 'column-reverse',
    }),
    [],
  );

  const fillerStyles = React.useMemo(
    () => css({
      flexGrow: '1',
    }),
    [],
  );

  const miniBarStyles = React.useMemo(
    () => css({
      pointerEvents: 'auto',
      transform: 'translateX(-100%)',
      animationFillMode: 'forwards',
      animationDuration: theme.animation.timing300,
      animationName: {
        from: {
          transform: 'translateX(-100%)',
          opacity: 0,
          visibility: 'hidden',
        },
        to: {
          transform: 'translateX(0)',
          opacity: 1,
          visibility: 'visible',
        },
      } as unknown as string,
    }),
    [],
  );

  const timeStyles = React.useMemo(
    () => css({
      height: '20px',
      paddingTop: '12px',
      paddingRight: '12px',
      paddingBottom: '12px',
      paddingLeft: '12px',
      color: theme.colors.white,
      fontSize: theme.typography.LabelSmall.fontSize,
      fontFamily: theme.typography.LabelSmall.fontFamily,
      textShadow: 'drop-shadow(0px 3px 3px -2px rgb(255 0 0 / 20%))',
      display: 'flex',
      alignItems: 'center',
      userSelect: 'none',
      '@media (max-width: 380px)': {
        display: 'none',
      },
    }),
    [theme.colors.white, theme.typography.DisplaySmall.fontFamily],
  );

  return {
    fillerStyles,
    controllerContainerStyles,
    timeStyles,
    miniBarStyles,
  };
};
interface IControllerProps {
  core: EpisodeCore;
  loadingComponent?: React.FC;
}
interface IControllerConfig {
  languageAvailable?: boolean;
}

const ifBrowserSupportsFullScreen = () => {
  const $body = document.body;
  const check = 'requestFullscreen' in $body
    || 'mozRequestFullScreen' in $body
    || 'webkitRequestFullscreen' in $body
    || 'msRequestFullscreen' in $body
    || 'exitFullscreen' in document
    || 'mozCancelFullScreen' in document
    || 'webkitExitFullscreen' in document;

  return check;
};

export const Controller = (config: IControllerConfig) => React.memo((props) => {
  const [css, theme] = useStyletron();

  const [miniMode, setMiniMode] = React.useState(false);

  const {
    controllerContainerStyles,
    miniBarStyles,
    timeStyles,
    fillerStyles,
  } = useStyles();

  const playing = useStore(props.core.playing);
  const dialogAreaVisible = useStore(props.core.dialogManager.dialogVisible);
  const fullScreen = useStore(props.core.fullScreen);
  const resolution = useStore(props.core.resolution);
  const volume = useStore(props.core.volume);
  const durations = useStore(props.core.segmentsDuration);
  const contentLanguage = useStore(props.core.contentLanguage);
  const subtitleLanguage = useStore(props.core.subtitleLanguage);
  const time = useStore(props.core.time);
  const totalTime = useStore(props.core.duration);
  const progress = (time / totalTime) * 100;

  const mainBarStyles = css({
    backgroundImage:
        'linear-gradient(0deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 100%)',
    pointerEvents: 'auto',
    transform: 'translateY(100%)',
    animationFillMode: 'forwards',
    animationDuration: theme.animation.timing300,
    animationName: {
      from: {
        transform: 'translateY(100%)',
        opacity: 0,
        visibility: 'hidden',
      },
      to: {
        transform: 'translateY(0)',
        opacity: 1,
        visibility: 'visible',
      },
    } as unknown as string,
  });

  const handleProgressSeek = React.useCallback(
    (_newProgress: number) => {
      const newProgress = _newProgress / 100;
      let localAccumulatedTime = 0;

      for (let i = 0; i < durations.length; i = i + 1) {
        const duration = durations[i];
        if (duration === Infinity) {
          continue;
        }
        if (localAccumulatedTime + duration >= newProgress * totalTime) {
          props.core.seek(i, newProgress * totalTime - localAccumulatedTime);
          break;
        }
        localAccumulatedTime += duration;
      }
    },
    [durations, progress],
  );

  const handleClickHomeButton = React.useCallback(
    () => props.core.getUserImplementedFunctions().gotoEpisode?.(
      props.core.seek,
      '0',
      false,
    ),
    [props.core],
  );
  const handleEnterMiniMode = React.useCallback(() => setMiniMode(true), []);
  const handleExitMiniMode = React.useCallback(() => setMiniMode(false), []);
  const handleResolutionChange = React.useCallback(
    (width:number, height:number) => props.core.resolution.set({ width, height }),
    [props.core],
  );
  const handleDialogOpen = React.useCallback(
    () => props.core.dialogManager.dialogVisible.set(true),
    [props.core],
  );
  const handleDialogClose = React.useCallback(
    () => props.core.dialogManager.dialogVisible.set(false),
    [props.core],
  );
  const handleVolumeChange = React.useCallback(
    (vol:number) => props.core.volume.set(vol),
    [props.core],
  );
  const handleEnterFullScreen = React.useCallback(
    () => props.core.fullScreen.set(true),
    [props.core],
  );
  const handleExitFullScreen = React.useCallback(
    () => props.core.fullScreen.set(false),
    [props.core],
  );
  const handleContentLanguageChange = React.useCallback(
    (lang:string) => props.core.contentLanguage.set(lang),
    [props.core],
  );
  const handleSubtitleLanguageChange = React.useCallback(
    (lang:string) => props.core.subtitleLanguage.set(lang),
    [props.core],
  );

  const playButton = (
      <PlayButton
        status={playing ? PlayButtonStatus.Playing : PlayButtonStatus.Paused}
        onPlay={props.core.play}
        onPause={props.core.pause}
      />
  );

  const miniModeButton = (
      <MiniModeButton
        status={miniMode ? MiniModeButtonStatus.On : MiniModeButtonStatus.Off}
        onEnterMiniMode={handleEnterMiniMode}
        onExitMiniMode={handleExitMiniMode}
      />
  );

  return (
      <ModuleContainer
        id="controllerContainer"
        key="controller"
        className={cn(controllerContainerStyles)}
      >
        {!miniMode && (
          <Block
            width="100%"
            display="flex"
            flexDirection="row"
            justifyContent="space-between"
            className={mainBarStyles}
          >
            <Block display="flex" justifyContent="space-between">
              <Block>{playButton}</Block>
              <Block>
                <HomeButton onClick={handleClickHomeButton} />
              </Block>
              <Block>
                <VolumeController
                  volume={volume}
                  onChange={handleVolumeChange}
                />
              </Block>
              <Block className={timeStyles}>
                {totalTime >= 0 && (
                  <span>
                    {formatTime(time)} / {formatTime(totalTime)}
                  </span>
                )}
              </Block>
            </Block>
            <Block display="flex" justifyContent="space-between">
              <Block>{miniModeButton}</Block>
              {(config.languageAvailable ?? true) && (
                <Block>
                  <LanguageButton
                    contentLanguage={contentLanguage}
                    subtitleLanguage={subtitleLanguage}
                    onContentLanguageChange={handleContentLanguageChange}
                    onSubtitleLanguageChange={handleSubtitleLanguageChange}
                  />
                </Block>
              )}
              <Block>
                <ResolutionSwitcher
                  width={resolution.width}
                  height={resolution.height}
                  onChange={handleResolutionChange}
                />
              </Block>
              <Block>
                <DialogSwitcher
                  status={
                    dialogAreaVisible
                      ? DialogSwitcherStatus.Open
                      : DialogSwitcherStatus.Closed
                  }
                  onOpen={handleDialogOpen}
                  onClose={handleDialogClose}
                />
              </Block>
              {ifBrowserSupportsFullScreen() && (
                <Block>
                  <FullScreenSwitcher
                    status={
                      fullScreen
                        ? FullScreenSwitcherStatus.On
                        : FullScreenSwitcherStatus.Off
                    }
                    onEnterFullScreenMode={handleEnterFullScreen}
                    onExitFullScreenMode={handleExitFullScreen}
                  />
                </Block>
              )}
            </Block>
          </Block>
        )}
        <ProgressBar
          progress={progress}
          durations={durations}
          miniMode={miniMode}
          onSeek={handleProgressSeek}
        />
        {miniMode && (
          <Block
            className={miniBarStyles}
            backgroundColor="rgba(0, 0, 0, 0.2)"
            position="absolute"
            bottom="48px"
            left="0"
          >
            {playButton}
            {miniModeButton}
          </Block>
        )}
        <Block className={fillerStyles} />
      </ModuleContainer>
  );
}) as React.FC<IControllerProps>;
