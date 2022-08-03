/**
 * The generic track interface
 */
export interface Track {
  /**
   * A function called by timeline to fetch the progress of the track.
   */
  check(): { time?: number, progress: number } | undefined;
  /**
   * A function called by timeline to ensure the progress across all tracks are synchronized
   * This function was called in every frame when the timeline is playing
   * You can update the time in your track or check the time against the time in another system
   * The return value should be true if and only if the track was stuck
   */
  update(time: number, progress: number): boolean;
  /**
   * A function called by timeline to hint that the timeline is seeked
   * useful to control another system used by the track
   */
  seek(time: number, progress: number): void
  /**
   * A function called by timeline to hint that the timeline is start playing
   * useful to control another system used by the track
   */
  play(): void
  /**
   * A function called by timeline to hint that the timeline is stop playing
   * useful to control another system used by the track
   */
  pause(): void
  /**
   * A function called by timeline to hint that the timeline is stuck by one of the tracks
   * useful to control another system used by the track
   */
  suspend(): void
  /**
   * A function called by timeline to hint that the timeline is no longer stuck by any tracks
   * useful to control another system used by the track
   */
  resume(): void
}
