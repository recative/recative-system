import type { ComponentFunctions, CoreFunctions } from '@recative/core-manager';

const isVideoPlaying = (video: HTMLVideoElement) => {
  // From: https://stackoverflow.com/questions/6877403/how-to-tell-if-a-video-element-is-currently-playing
  return !!(video.currentTime > 0
    && !video.paused
    && !video.ended
    && video.readyState > HTMLMediaElement.HAVE_CURRENT_DATA);
};

export const getController = (id: string) => {
  let $video: HTMLVideoElement | null = null;
  let coreFunctions: CoreFunctions | null = null;

  let videoReady = false;
  let videoShown = false;
  let trackPlaying = false;
  let trackSuspended = false;
  let cachedTime = 0;

  const playVideo = () => {
    if (!$video) return false;
    if (!videoReady) return false;
    if (!videoShown) return false;
    if (isVideoPlaying($video)) return false;

    $video.play().catch(() => { });
  };

  const checkVideoPlayingState = () => {
    // For iOS Safari: sometime the video is unexpected paused by browser when the window is hidden
    if (!$video || !videoReady) {
      return;
    }
    if ($video.ended) {
      return;
    }
    const isPlaying = trackPlaying && !trackSuspended;
    if (isPlaying !== !$video.paused) {
      coreFunctions?.log(`Unmatched playing state: should be ${isPlaying} instead of ${!$video.paused}`);
      if (isPlaying) {
        playVideo();
      } else {
        $video.pause();
      }
    }
  };

  let lastSyncTime = Date.now();

  const reportProgress = () => {
    if (!coreFunctions) return;
    if (!$video) return;
    coreFunctions.reportProgress(
      $video.currentTime * 1000,
    );
    lastSyncTime = Date.now();
  }

  const forceCheckup = () => {
    if (!coreFunctions) return;
    if (!$video) return;
    checkVideoPlayingState();

    const isPlaying = trackPlaying && !trackSuspended;
    const syncΔt = Date.now() - lastSyncTime;

    if (isPlaying && syncΔt > 300) {
      reportProgress()
    }
  };

  const seekVideo = (time: number) => {
    // For iOS Safari: seek to video won't work before loaded metadata
    // AND when metadata loaded and data not loaded
    // it will put the video element into a buggy state
    // where seeking is always true and currentTime won't update when playing
    // and seek will update currentTime but never actually works
    if (!$video || !videoReady) {
      cachedTime = time;
      return;
    }
    if ($video.readyState >= $video.HAVE_METADATA && time / 1000 > $video.duration) {
      // video should be already end!
      coreFunctions?.finishItself();
    } else {
      $video.currentTime = time / 1000;
    }
  };

  const onVideoReady = () => {
    if (trackPlaying && !trackSuspended) {
      playVideo();
    } else {
      $video?.pause();
    }
    if ($video !== null) {
      $video.currentTime = cachedTime / 1000;
    }
  };

  const setVideoTag = (videoTag: HTMLVideoElement) => {
    $video = videoTag;
  };

  const removeVideoTag = () => { $video = null; };

  const reloadVideo = () => {
    $video?.load();
    videoReady = false;
  }

  const setVideoReady = () => {
    if (videoReady) {
      return;
    }
    videoReady = true;
    onVideoReady();
  };

  const setVideoShown = () => {
    videoShown = true;
    if (trackPlaying && !trackSuspended) {
      playVideo();
    }
  };

  const controller: Partial<ComponentFunctions> = {
    showContent: (contentId) => {
      if (contentId !== id) return;

      setVideoShown();
    },
    play() {
      trackPlaying = true;
      if (!trackSuspended) {
        playVideo();
      }
    },
    pause() {
      trackPlaying = false;
      if (!trackSuspended) {
        $video?.pause();
      }
    },
    resume() {
      trackSuspended = false;
      if (trackPlaying) {
        playVideo();
      }
    },
    sync(time) {
      if (!$video) return false;

      checkVideoPlayingState();
      seekVideo(time);
    },
    suspend() {
      trackSuspended = true;
      if (trackPlaying) {
        $video?.pause();
      }
    },
  };

  const setCoreFunctions = (x: CoreFunctions) => {
    coreFunctions = x;
  };

  return {
    controller,
    setVideoTag,
    seekVideo,
    reloadVideo,
    removeVideoTag,
    setVideoReady,
    setVideoShown,
    setCoreFunctions,
    reportProgress,
    forceCheckup,
    checkVideoPlayingState,
  };
};
