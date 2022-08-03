const remoteProgressElement = document.getElementById('remote-progress')!;
const stick = document.getElementById('stuck')!;
const unstick = document.getElementById('unstuck')!;
let remoteRafId: number | null = null;
let remoteProgress = 0;
let remoteProgressUpdateTime = 0;
let suspended = false;
let stuck = false;
stick.addEventListener('click', () => {
  stuck = true;
  window.parent.postMessage({
    progress: remoteProgress,
    time: remoteProgressUpdateTime + performance.timeOrigin,
    stuck,
  });
});
unstick.addEventListener('click', () => {
  stuck = false;
  window.parent.postMessage({
    progress: remoteProgress,
    time: remoteProgressUpdateTime + performance.timeOrigin,
    stuck,
  });
});
const mockRemoteLoop = () => {
  const now = performance.now();
  if (!(suspended || stuck)) {
    remoteProgress += (now - remoteProgressUpdateTime);
    window.parent.postMessage({
      progress: remoteProgress,
      time: remoteProgressUpdateTime + performance.timeOrigin,
      stuck,
    });
  }
  remoteProgressUpdateTime = now;
  remoteProgressElement.innerHTML = `${remoteProgress}`;
  remoteRafId = requestAnimationFrame(mockRemoteLoop);
};
const handler: Record<string, Function> = {
  sync(time: number, progress: number): void {
    console.log('remote resync!');
    if (stuck) {
      return;
    }
    remoteProgressUpdateTime = time - performance.timeOrigin;
    remoteProgress = progress;
    if (remoteRafId === null) {
      remoteProgressElement.innerHTML = `${remoteProgress}`;
    }
  },
  play() {
    if (remoteRafId === null) {
      remoteProgressUpdateTime = performance.now();
      remoteRafId = requestAnimationFrame(mockRemoteLoop);
      window.parent.postMessage({
        progress: remoteProgress,
        time: remoteProgressUpdateTime + performance.timeOrigin,
        stuck,
      });
    }
  },
  pause() {
    if (remoteRafId !== null) {
      const now = performance.now();
      remoteProgress += now - remoteProgressUpdateTime;
      remoteProgressUpdateTime = now;
      cancelAnimationFrame(remoteRafId);
      remoteRafId = null;
      window.parent.postMessage({
        progress: remoteProgress,
        time: remoteProgressUpdateTime + performance.timeOrigin,
        stuck,
      });
    }
  },
  suspend() {
    suspended = true;
  },
  resume() {
    suspended = false;
  },
};
window.addEventListener('message', (event) => {
  // console.log(event.data);
  handler[String(event.data?.command)]?.(...(event.data?.param ?? []));
});
