import {
  Remote, RemoteTrack, Timeline, MonitorTrack,
} from '../src';

const play = document.getElementById('play')!;
const pause = document.getElementById('pause')!;
const seek3000 = document.getElementById('seek3000')!;
const progressElement = document.getElementById('progress')!;
const inner = document.getElementById('inner')! as HTMLIFrameElement;

const timeline = new Timeline();

timeline.addTrack(new MonitorTrack((time, progress) => {
  progressElement.innerHTML = `${progress}`;
}, () => {}), -Infinity);

let remoteProgress = 0;
let remoteProgressUpdateTime = 0;
let remoteStuck = false;
window.addEventListener('message', (event) => {
  const { data } = event;
  if ('progress' in data && 'time' in data) {
    remoteProgress = data.progress;
    remoteProgressUpdateTime = data.time - performance.timeOrigin;
  }
  if ('stuck' in data) {
    remoteStuck = data.stuck;
  }
});
const remote: Remote = {
  get progress() {
    return remoteProgress;
  },
  get updateTime() {
    return remoteProgressUpdateTime;
  },
  get stuck() {
    return remoteStuck;
  },
  sync(time: number, progress: number): void {
    // Since it is possible that message from inner was not received in the next iteration
    // pretend that they are in sync when that happens
    remoteProgress = progress;
    remoteProgressUpdateTime = time;
    inner.contentWindow!.postMessage({ command: 'sync', param: [time + performance.timeOrigin, progress] });
  },
  play() {
    // Since it is possible that message from inner was not received in the next iteration
    // pretend that they are in sync when that happens
    remoteProgressUpdateTime = performance.now();
    inner.contentWindow!.postMessage({ command: 'play' });
  },
  pause() {
    inner.contentWindow!.postMessage({ command: 'pause' });
  },
  suspend() {
    inner.contentWindow!.postMessage({ command: 'suspend' });
  },
  resume() {
    inner.contentWindow!.postMessage({ command: 'resume' });
  },
};
timeline.addTrack(new RemoteTrack(remote), -1);

play.addEventListener('click', () => {
  timeline.play();
});
pause.addEventListener('click', () => {
  timeline.pause();
});
seek3000.addEventListener('click', () => {
  timeline.time = 3000;
});
