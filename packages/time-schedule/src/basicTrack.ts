import { Track } from './track';

/**
 * A basic track that keep track of the time using the basic clock
 */
export class BasicTrack implements Track {
  private lastUpdateTime = 0;

  private progress = 0;

  private playing = false;

  private suspended = false;

  check() {
    return { time: this.lastUpdateTime, progress: this.progress };
  }

  update(time: number, progress: number) {
    this.seek(time, progress);
    return false;
  }

  seek(time: number, progress: number) {
    const newTime = performance.now();
    if (this.playing && !this.suspended) {
      this.progress = progress + newTime - time;
    } else {
      this.progress = progress;
    }
    this.lastUpdateTime = newTime;
  }

  play() {
    this.playing = true;
    this.lastUpdateTime = performance.now();
  }

  pause() {
    const now = performance.now();
    if (this.playing && !this.suspended) {
      this.progress += now - this.lastUpdateTime;
    }
    this.lastUpdateTime = now;
    this.playing = false;
  }

  suspend() {
    const now = performance.now();
    if (this.playing && !this.suspended) {
      this.progress += now - this.lastUpdateTime;
    }
    this.lastUpdateTime = now;
    this.suspended = true;
  }

  resume() {
    this.suspended = false;
    this.lastUpdateTime = performance.now();
  }
}
