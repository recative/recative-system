import { BasicTrack } from './basicTrack';
import { Track } from './track';

/**
 * The timeline used to coordinate time and progress of different tracks
 * It do not has a length, so you should manually stop it when everything is finished.
 */
export class Timeline {
  private nextRafId: number | null = null;

  private stuck = false;

  tracks: { track: Track, priority: number }[] = [];

  constructor() {
    // make sure there is always at least one usable time source
    this.addTrack(new BasicTrack(), 0);
  }

  /**
   * Is the timeline stuck by one of its track
   */
  isStuck() {
    return this.stuck;
  }

  /**
   * Get the current progress of the timeline
   */
  get time() {
    const { time, progress } = this.check();
    if (this.nextRafId === null) {
      return progress;
    }
    return progress + performance.now() - time;
  }

  /**
   * Set the current progress of the timeline, seek the timeline
   */
  set time(value) {
    this.tracks.forEach(({ track }) => {
      track.seek(performance.now(), value);
    });
  }

  /**
   * Get the current progress of the timeline
   */
  get playing() {
    return this.nextRafId !== null;
  }

  /**
   * Play the timeline
   */
  play() {
    if (this.nextRafId !== null) {
      return;
    }
    this.tracks.forEach(({ track }) => {
      track.play();
    });
    this.nextRafId = requestAnimationFrame(this.updater);
  }

  /**
   * Pause the timeline
   */
  pause() {
    if (this.nextRafId !== null) {
      cancelAnimationFrame(this.nextRafId);
      this.nextRafId = null;
    }
    this.tracks.forEach(({ track }) => {
      track.pause();
    });
  }

  private check(): { time: number, progress: number } {
    for (let i = 0; i < this.tracks.length; i += 1) {
      const result = this.tracks[i].track.check();
      if (result !== undefined) {
        return { time: result.time ?? performance.now(), progress: result.progress };
      }
    }
    throw new Error('The timeline do not have a time source');
  }

  private update() {
    this.nextRafId = requestAnimationFrame(this.updater);
    const { time, progress } = this.check();
    const stuck = this.tracks.map(({ track }) => track.update(time, progress))
      .findIndex((e) => e === true) >= 0;
    if (this.stuck !== stuck) {
      this.stuck = stuck;
      if (this.stuck) {
        this.tracks.forEach(({ track }) => {
          track.suspend();
        });
      } else {
        this.tracks.forEach(({ track }) => {
          track.resume();
        });
      }
    }
  }

  /**
   * Add a track to the timeline
   */
  addTrack(track: Track, priority: number = 0) {
    this.tracks.push({ track, priority });
    this.tracks.sort((a, b) => b.priority - a.priority);
    const { time, progress } = this.check();
    track.seek(time, progress);
    if (this.nextRafId !== null) {
      track.play();
    }
    if (this.stuck) {
      track.suspend();
    }
  }

  private updater = this.update.bind(this);
}
