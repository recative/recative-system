import { Track } from 'track';

/**
 * The track used to subscribe state change on timeline,
 * which is useful to update related visual appearance
 */
export class MonitorTrack implements Track {
  constructor(
    private onUpdate: (time: number, progress: number) => void,
    private onStuckChange: (stuck: boolean) => void,
  ) {}

  seek(time: number, progress: number) {
    this.onUpdate(time, progress);
  }

  // eslint-disable-next-line class-methods-use-this
  play() {}

  // eslint-disable-next-line class-methods-use-this
  pause() {}

  // eslint-disable-next-line class-methods-use-this
  check() { return undefined; }

  update(time: number, progress: number) {
    this.onUpdate(time, progress);
    return false;
  }

  suspend() {
    this.onStuckChange(true);
  }

  resume() {
    this.onStuckChange(false);
  }
}
