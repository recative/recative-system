import * as React from 'react';
import cn from 'classnames';
import debug from 'debug';
import useConstant from 'use-constant';

import { useStore } from '@nanostores/react';
import { useInterval } from 'react-use';
import { useStyletron } from 'baseui';

import { Block } from 'baseui/block';

import {
  AudioElementInit, convertSRTToStates, PostProcessCallback, selectUrlAudioElementInitPostProcess,
} from '@recative/core-manager';
import { getMatchedResource } from '@recative/smart-resource';

import { IResourceFileForClient } from '@recative/definitions';
import { isSafari } from '../../variables/safari';
import { ModuleContainer } from '../Layout/ModuleContainer';

import type { AssetExtensionComponent } from '../../types/ExtensionCore';

import { getController } from './videoControllers';

const log = debug('player:video');

// milliseconds
const UNSTUCK_CHECK_INTERVAL = 500;

// seconds
const BUFFER_SIZE_TARGET = 5;
const BUFFER_SIZE_DELTA = 1;

// data url for one pixel black png
const BLANK_POSTER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAAXNSR0IArs4c6QAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAABNJREFUCB1jZGBg+A/EDEwgAgQADigBA//q6GsAAAAASUVORK5CYII%3D';

const VIDEO_QUERY_CONFIG = {
  category: 'video',
};

const RESOURCE_QUERY_WEIGHTS = {
  category: 1e4,
  lang: 1,
};

const IS_SAFARI = isSafari();

const isVideoWaiting = (video: HTMLVideoElement) => {
  let buffering = true;
  const { buffered, currentTime } = video;
  for (let i = 0; i < buffered.length; i += 1) {
    if (buffered.start(i) <= currentTime && currentTime < buffered.end(i)) {
      buffering = false;
    }
  }
  return video.seeking || buffering;
};

const hasEnoughBuffer = (video: HTMLVideoElement) => {
  // Note: sometime the browser do not update buffered
  // when it actually has enough data (like chrome)
  // However you can always trust readyState
  if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return true;
  }
  const { buffered, duration, currentTime } = video;
  for (let i = 0; i < buffered.length; i += 1) {
    if (buffered.start(i) <= currentTime && currentTime < buffered.end(i)) {
      if (
        buffered.end(i)
        >= Math.min(duration - BUFFER_SIZE_DELTA, currentTime + BUFFER_SIZE_TARGET)
      ) {
        return true;
      }
    }
  }
  return false;
};

export const InternalVideo: AssetExtensionComponent = (props) => {
  const [css] = useStyletron();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const videoSourceRef = React.useRef<HTMLSourceElement>(null);
  const subtitleRef = React.useRef<string | null>('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const unstuckCheckInterval = React.useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const videoComponentInitialized = React.useRef(false);

  const fullSizeStyle = css({
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  });

  const core = useConstant(() => {
    const controller = getController(props.id);

    const coreFunctions = props.core.registerComponent(
      props.id,
      controller.controller,
    );

    controller.setCoreFunctions(coreFunctions);

    return { controller, coreFunctions };
  });

  const resolution = useStore(props.core.resolution);
  const contentLanguage = useStore(props.core.contentLanguage);
  const subtitleLanguage = useStore(props.core.subtitleLanguage);

  const clearUnstuckCheckInterval = React.useCallback(() => {
    if (unstuckCheckInterval.current !== null) {
      clearInterval(unstuckCheckInterval.current);
      unstuckCheckInterval.current = null;
    }
  }, []);

  const unstuckCheck = React.useCallback(() => {
    if (hasEnoughBuffer(videoRef.current!)) {
      core.coreFunctions.reportUnstuck();
      clearUnstuckCheckInterval();
    }
  }, [core, clearUnstuckCheckInterval]);

  const scheduleUnstuckCheck = React.useCallback(() => {
    if (unstuckCheckInterval.current === null) {
      unstuckCheckInterval.current = setInterval(
        () => unstuckCheck(),
        UNSTUCK_CHECK_INTERVAL,
      );
      unstuckCheck();
    }
  }, [unstuckCheck]);

  const stuck = React.useCallback(() => {
    if (!isVideoWaiting(videoRef.current!)) {
      // Chrome somehow gives false positive here
      // maybe it is just seeking but it seeks so fast that
      // we already complete seeking here
      return;
    }
    if (videoRef.current!.readyState <= HTMLMediaElement.HAVE_CURRENT_DATA) {
      core.coreFunctions.log('Stuck reason: do not have data');
    } else if (videoRef.current!.seeking) {
      core.coreFunctions.log('Stuck reason: seeking');
    } else {
      core.coreFunctions.log('Stuck reason: unknown');
    }
    // As a workaround to force the browser to update the readyState
    if (!videoRef.current!.seeking) {
      videoRef.current!.currentTime = videoRef.current!.currentTime;
    }
    core.coreFunctions.reportStuck();
    clearUnstuckCheckInterval();
  }, [core, clearUnstuckCheckInterval]);

  React.useEffect(() => {
    return () => clearUnstuckCheckInterval();
  }, [clearUnstuckCheckInterval, core]);

  React.useLayoutEffect(() => {
    if (videoComponentInitialized.current) return;

    const $video = videoRef.current;
    if (!$video) return;

    videoComponentInitialized.current = true;

    $video.muted = true;
    $video.controls = false;
    $video.autoplay = false;
    $video.className = fullSizeStyle;
    $video.setAttribute('playsinline', 'true');
    $video.setAttribute('x5-playsinline', 'true');
    $video.setAttribute('webkit-playsinline', 'true');
    $video.setAttribute('x5-video-player-type', 'h5');
    $video.setAttribute('x5-video-player-fullscreen', 'true');
    core.controller.setVideoTag($video);

    return () => {
      core.controller.removeVideoTag();
    };
  }, [core.controller, fullSizeStyle]);

  const episodeData = props.core.getEpisodeData()!;

  const queryMethod = 'resourceLabel' in props.spec ? 'label' : 'id';

  const resourceMap = 'resourceLabel' in props.spec
    ? episodeData.resources.itemsByLabel
    : episodeData.resources.itemsById;

  const query = props.spec.resourceLabel ?? props.spec.resourceId;

  if (typeof query !== 'string') {
    throw new Error('Invalid resource query!');
  }

  React.useLayoutEffect(() => {
    const resourceDefinition = resourceMap.get(query);

    if (!resourceDefinition) {
      throw new TypeError(`Resource with ${queryMethod} query "${query}" was not found`);
    }

    const matchedResourceUrl = episodeData.resources.getResourceByQuery(
      query,
      queryMethod,
      VIDEO_QUERY_CONFIG,
      RESOURCE_QUERY_WEIGHTS,
    );

    let mime: string;
    if (resourceDefinition.type === 'group') {
      const mimesInGroup = resourceDefinition.files
        .map((x) => ({
          selector: x.tags,
          item: x.mimeType,
        }));

      mime = getMatchedResource(
        mimesInGroup,
        VIDEO_QUERY_CONFIG,
        RESOURCE_QUERY_WEIGHTS,
      );
    } else if (resourceDefinition.type === 'file') {
      mime = resourceDefinition.mimeType;
    } else {
      throw new TypeError('Unknown resource type');
    }

    log('Matched resource is:', matchedResourceUrl);

    Promise.resolve(matchedResourceUrl)
      .then((selectedVideo) => {
        if (!selectedVideo) {
          throw new Error('Invalid audio URL');
        }

        if (selectedVideo !== videoSourceRef.current!.src) {
          videoSourceRef.current!.src = selectedVideo;
          videoSourceRef.current!.type = mime;
          videoRef.current!.load();
          clearUnstuckCheckInterval();
        }
      });
  }, [
    query,
    resourceMap,
    resolution,
    contentLanguage,
    queryMethod,
    clearUnstuckCheckInterval,
    episodeData.resources,
  ]);

  React.useLayoutEffect(() => {
    const matchedResource = episodeData.resources.getResourceByQuery<
    AudioElementInit, PostProcessCallback<
    AudioElementInit, IResourceFileForClient
    >
    >(
      query,
      queryMethod,
      {
        category: 'audio',
      },
      RESOURCE_QUERY_WEIGHTS,
      selectUrlAudioElementInitPostProcess,
    );
    core.coreFunctions.setAudioTrack(matchedResource);
  }, [
    props.spec,
    contentLanguage,
    query,
    core.coreFunctions,
    episodeData.resources,
    queryMethod,
  ]);

  React.useLayoutEffect(() => {
    if (subtitleLanguage !== 'null') {
      const matchedResource = episodeData.resources.getResourceByQuery(
        query,
        queryMethod,
        {
          category: 'subtitle',
          lang: subtitleLanguage,
        },
        RESOURCE_QUERY_WEIGHTS,
      );

      Promise.resolve(matchedResource)
        .then((selectedSubtitle) => {
          if (!selectedSubtitle) {
            throw new Error('Invalid audio URL');
          }

          if (selectedSubtitle === subtitleRef.current) return;

          subtitleRef.current = selectedSubtitle || null;

          if (subtitleRef.current === null) {
            core.coreFunctions.setManagedCoreStateTriggers([]);
            return;
          }

          return fetch(subtitleRef.current)
            .then((respond) => respond.text())
            .then((srt) => {
              if (subtitleRef.current === selectedSubtitle) {
                core.coreFunctions.setManagedCoreStateTriggers(
                  convertSRTToStates(srt, props.id),
                );
              }
            });
        });
    }
  }, [
    props.spec,
    props.core,
    subtitleLanguage,
    query,
    core.coreFunctions,
    props.id,
    episodeData.resources,
    queryMethod,
  ]);

  React.useEffect(() => {
    core.coreFunctions.updateContentState('preloading');

    return () => props.core.unregisterComponent(props.id);
  }, [core.coreFunctions, props.core, props.id]);

  /**
   * This is a dirty fix for a bug in the Safari browser (iOS 14.4), it
   * reports the video is playing but not actually playing, we have to
   * tell core manager to force kick the video element.
   */
  useInterval(core.controller.forceCheckup, IS_SAFARI ? 100 : null);

  const handleCanPlay = React.useCallback(() => {
    scheduleUnstuckCheck();
    core.coreFunctions.updateContentState('ready');
    core.controller.setVideoReady();
  }, [core.controller, core.coreFunctions, scheduleUnstuckCheck]);

  const handleLoadedMetadata = React.useCallback(() => {
    // For iOS Safari: the browser won't load the data until the video start to play
    // For other browser: the browser only load the first some frames
    // when the video is never played so the browser may not load the more buffer
    // when there is not enough buffer
    videoRef.current!.play();
  }, []);

  const handleTimeUpdate = React.useCallback(() => {
    core.controller.updateSyncTime();
    core.coreFunctions.reportProgress(
      videoRef.current!.currentTime * 1000,
    );
    core.controller.checkVideoPlayingState();
  }, [core.controller, core.coreFunctions]);

  const handleWaiting = React.useCallback(() => {
    stuck();
  }, [stuck]);

  return (
    <ModuleContainer hidden={!props.show}>
      <Block ref={containerRef} className={cn(fullSizeStyle)}>
        {/* Caption was implemented in another component */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          className={fullSizeStyle}
          preload="auto"
          poster={BLANK_POSTER}
          onCanPlay={handleCanPlay}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={core.coreFunctions.finishItself}
          onWaiting={handleWaiting}
        >
          <source ref={videoSourceRef} />
        </video>
      </Block>
    </ModuleContainer>
  );
};

export const Video = React.memo(InternalVideo);
