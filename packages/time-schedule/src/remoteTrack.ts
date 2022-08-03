import { Track } from 'track';

/**
 * An abstract interface used by RemoteTrack to represent remote system
 */
export interface Remote{
  /**
   * The latest known progress of the remote system
   */
  get progress(): number
  /**
   * The time of the latest known progress
   */
  get updateTime(): number
  /**
   * Is the remote system stuck
   */
  get stuck(): boolean
  /**
   * Send a signal to the remote system to synchronize progress
   */
  sync(time: number, progress: number): void
  /**
   * Send a signal to the remote system as a hint to play
   */
  play(): void
  /**
   * Send a signal to the remote system as a hint to pause
   */
  pause(): void
  /**
   * Send a signal to the remote system as a hint to suspend
   */
  suspend(): void
  /**
   * Send a signal to the remote system as a hint to resume
   */
  resume(): void
}

const defaultRemoteTimeDifferenceLimit = 33;

/**
 * The track used to synchronize with remote system, like an animation loop in an iframe.
 */
export class RemoteTrack implements Track {
  remote: Remote;

  private playing = false;

  private suspended = false;

  constructor(
    remote: Remote,
    private remoteTimeDifferenceLimit = defaultRemoteTimeDifferenceLimit,
  ) {
    this.remote = remote;
  }

  check() {
    return { time: this.remote.updateTime, progress: this.remote.progress };
  }

  update(time: number, progress: number) {
    const timeDiff = this.playing && !this.suspended ? time - this.remote.updateTime : 0;
    const diff = Math.abs((progress - this.remote.progress) - timeDiff);
    if (diff > this.remoteTimeDifferenceLimit) {
      this.remote.sync(time, progress);
    }
    return this.remote.stuck;
  }

  play() {
    this.playing = true;
    this.remote.play();
  }

  pause() {
    this.playing = false;
    this.remote.pause();
  }

  suspend() {
    this.suspended = true;
    this.remote.suspend();
  }

  resume() {
    this.suspended = false;
    this.remote.resume();
  }

  seek(time: number, progress: number) {
    return this.remote.sync(time, progress);
  }
}
