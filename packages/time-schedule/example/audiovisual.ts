import {
  AudioMixer,
  AudioSource,
  getGlobalAudioStation,
} from '@recative/audio-station';

import { Remote, RemoteTrack, Timeline, MonitorTrack } from '../src';

const video = document.getElementById('video')! as HTMLVideoElement;
const progressElement = document.getElementById('progress')!;
const activate = document.getElementById('activate')!;
const seek0 = document.getElementById('seek0')!;
const seek8000 = document.getElementById('seek8000')!;

const timeline = new Timeline();

timeline.addTrack(
  new MonitorTrack(
    (progress, time) => {
      progressElement.innerHTML = `${time}`;
      return false;
    },
    () => {}
  )
);

let videoSuspended = false;
let videoPlaying = false;
const videoRemote: Remote = {
  get progress() {
    return video.currentTime * 1000;
  },
  get updateTime() {
    return performance.now();
  },
  get stuck() {
    return video.readyState < 3 || video.ended;
  },
  sync(time: number, progress: number): void {
    console.log(`before sync ${video.currentTime}`);
    const target = (progress + performance.now() - time) / 1000;
    video.currentTime = target;
    console.log(`after sync ${video.currentTime}`);
  },
  play() {
    videoPlaying = true;
    if (!videoSuspended) {
      console.log('video play');
      video.play();
    }
  },
  pause() {
    videoPlaying = false;
    if (!videoSuspended) {
      console.log('video pause');
      video.pause();
    }
  },
  suspend() {
    videoSuspended = true;
    if (videoPlaying) {
      console.log('video pause');
      video.pause();
    }
  },
  resume() {
    videoSuspended = false;
    if (videoPlaying) {
      console.log('video play');
      video.play();
    }
  },
};
timeline.addTrack(new RemoteTrack(videoRemote));

const station = getGlobalAudioStation();
activate!.addEventListener('click', () => {
  station.activate();
});
Promise.all([
  station.load(new URL('./tmpMo4GJT.mp3', import.meta.url).toString()),
  station.activate(),
]).then(([clip]) => {
  activate.style.display = 'none';
  const mixer = new AudioMixer(station);
  const source = new AudioSource(mixer, clip);
  let lastUpdateTime = performance.now();
  let lastProgress = source.time;
  const updateTime = (force: boolean = false) => {
    const time = performance.now();
    if (source.isPlaying() && !mixer.isSuspended()) {
      if (
        force ||
        source.time * 1000 - lastProgress > (time - lastUpdateTime) * 0.01
      ) {
        lastProgress = source.time * 1000;
        lastUpdateTime = time;
      }
    } else {
      lastProgress = source.time * 1000;
      lastUpdateTime = time;
    }
  };
  timeline.addTrack(
    {
      play: () => {
        console.log('audio play');
        updateTime(false);
        source.play();
      },
      pause: () => {
        console.log('audio pause');
        updateTime(false);
        source.pause();
      },
      suspend: () => {
        updateTime(false);
        mixer.suspend();
      },
      resume: () => {
        updateTime(false);
        mixer.resume();
      },
      seek: (time: number, progress: number) => {
        console.log('audio seek');
        const target = progress + performance.now() - time;
        console.log(progress, performance.now(), time);
        console.log(target);
        source.time = target / 1000;
        updateTime(true);
      },
      check() {
        updateTime(false);
        return {
          time: lastUpdateTime,
          progress: lastProgress,
        };
      },
      update: (time: number, progress: number) => {
        updateTime(false);
        const now = performance.now();
        const target = progress + now - time;
        const current = lastProgress + now - lastUpdateTime;
        if (Math.abs(target - current) > 33) {
          console.log(progress, now, time);
          console.log(lastProgress, now, lastUpdateTime);
          console.log(target, current);
          source.time = target / 1000;
          updateTime(true);
        }
        return false;
      },
    },
    1
  );
  timeline.play();
});

seek0.addEventListener('click', () => {
  timeline.time = 0;
  timeline.play();
});
seek8000.addEventListener('click', () => {
  timeline.time = 8000;
  timeline.play();
});
video.addEventListener('ended', () => {
  timeline.pause();
});
