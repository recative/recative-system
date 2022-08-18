/**
 * Function that will be for called each tick.
 *
 * @param timestamp Current high-resolution timestamp;
 * @param deltaTime Time since last tick, in milliseconds;
 * @param framesElapsed Number of frames that have
 *          elapsed since the last tick till now, the minimum
 *          value is 1, dropped ticks will be counted.
 */
export type TickCallback = (
  timestamp: number,
  deltaTime: number,
  ticksElapsed: number
) => void;

/**
 * The callback of Ticker is executed every how many frames,
 * which is a performance optimization parameter to reduce
 * heating problem on mobile platform.
 *
 * D0 means that the callback function is executed every time
 * the RAF is called (\~60 fps);
 * D1 means that the function is executed every other frame
 * (\~30 fps) , and so on.
 *
 * When the the screen is touched, frame rate level will be
 * upgraded to the D0 level by default to provide a smooth
 * user experience.
 */
export enum FrameRateLevel {
  D0 = 0,
  D1 = 1,
  D2 = 2,
  D3 = 3,
}

/**
 * Determine the function is called on which frame of each
 * rendering cycle, this is related to `FrameRateLevel`, if the
 * frame rate level is D1, and the frame order is O1, the
 * function will be called on the second frame of each cycle.
 *
 * If order level is greater than the frame rate level, the
 * function will be called on the last frame of each cycle.
 *
 * `OD\*` means after the first frame of each cycle, execute
 * the function is executed every how many frames, this is
 * useful for background tasks, this kind of task will be
 * executed at least one time per cycle.
 */
export enum FrameOrderLevel {
  OD0 = -1,
  OD1 = -2,
  OD2 = -3,
  O0 = 0,
  O1 = 1,
  O2 = 2,
  O3 = 3,
}

export const DEFAULT_FRAME_RATE_LEVEL = FrameRateLevel.D3;
export const DEFAULT_FRAME_ORDER_LEVEL = FrameOrderLevel.O0;

export class TimeMagic {
  /**
   * Last valid rendering time stamp.
   */
  lastTickTime = -1;

  /**
   * Accumulated tick time since `TimeMagic` was created.
   */
  accumulateTime = 0;

  speed: number;

  playing: boolean = false;

  private rateLevelMap: Map<TickCallback | symbol, FrameRateLevel> = new Map();

  private orderLevelMap: Map<FrameOrderLevel, TickCallback[]> = new Map();

  private frameOfCycle = 0;

  private minRateLevel = DEFAULT_FRAME_RATE_LEVEL;

  private timestampBeforeWindowHidden = -1;

  private accumulateTimeWhileWindowHidden = 0;

  private readonly maxPhase: number;

  constructor(
    frameRateLimiter: number | null = 60,
    speed: number = 1,
  ) {
    this.speed = speed;
    this.updateSpeed = this.updateSpeed.bind(this);
    this.tick = this.tick.bind(this);
    this.replay = this.replay.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

    // Convert frequency to period to make it easier to calculate.
    // `Math.floor(...) - 1` is a trick to reduce the affection caused
    // by floating point precision and frame rate fluctuations of
    // browsers without affecting "low refresh rate" devices.
    this.maxPhase = frameRateLimiter ? Math.floor(1000 / frameRateLimiter) - 1 : -Infinity;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('pagehide', this.handleVisibilityChange);
  }

  private handleVisibilityChange() {
    if (!this.playing) return;
    if (document.visibilityState === 'hidden') {
      this.timestampBeforeWindowHidden = this.lastTickTime;
    }
  }

  /**
   * Mark the timestamp as a valid rendering frame.
   * @param t The time stamp of the current frame.
   */
  updateLastTickTime(t: number) {
    if (this.lastTickTime === -1) {
      this.lastTickTime = t;
    } else {
      const deltaT = t - this.lastTickTime;
      this.accumulateTime += deltaT * this.speed;
    }

    this.lastTickTime = t;
  }

  updateSpeed(speed: number) {
    this.speed = speed;
  }

  getTime() {
    return this.accumulateTime - this.accumulateTimeWhileWindowHidden;
  }

  /**
   * Get smallest frame rate level from `rateLevelMap`.
   */
  private updateMinRateLevel() {
    this.minRateLevel = DEFAULT_FRAME_RATE_LEVEL;

    this.rateLevelMap.forEach((rateLevel) => {
      if (rateLevel < this.minRateLevel) {
        this.minRateLevel = rateLevel;
      }
    });
  }

  /**
   * Request the ticker run in specific frame rate level.
   * @param frameRateLevel The frame rate level that is expected to work.
   * @param tokenName The name of the task, only for debug purpose, two tokens
   *          with the same name won't be overwritten.
   * @returns A callback that will cancel this task.
   */
  registryRateLevel(frameRateLevel: FrameRateLevel, tokenName = 'cancelToken') {
    const cancelToken = Symbol(tokenName);

    this.rateLevelMap.set(cancelToken, frameRateLevel);
    this.updateMinRateLevel();

    return () => {
      this.rateLevelMap.delete(cancelToken);
      this.updateMinRateLevel();
    };
  }

  addFn(
    x: TickCallback,
    frameRateLevel = DEFAULT_FRAME_RATE_LEVEL,
    frameOrderLevel = DEFAULT_FRAME_ORDER_LEVEL,
  ) {
    // Check if the function is already registered in frame order level.
    const fns = this.orderLevelMap.get(frameOrderLevel);
    if (fns && fns.findIndex((i) => i === x) !== -1) {
      return;
    }

    this.rateLevelMap.set(x, frameRateLevel);
    if (!this.orderLevelMap.has(frameOrderLevel)) {
      this.orderLevelMap.set(frameOrderLevel, []);
    }
    this.orderLevelMap.get(frameOrderLevel)!.push(x);
    this.updateMinRateLevel();
  }

  private removeFnFromOrderLevel(
    x: TickCallback,
    frameOrderLevel: FrameOrderLevel,
  ) {
    const fns = this.orderLevelMap.get(frameOrderLevel);
    if (!fns) return;

    const idx = fns.findIndex((a) => a === x);
    if (idx >= 0) {
      fns.splice(idx, 1);
    }
  }

  removeFn(x: TickCallback, frameOrderLevel: FrameOrderLevel | null = null) {
    if (frameOrderLevel !== null) {
      this.removeFnFromOrderLevel(x, frameOrderLevel);
    } else {
      const existedOrderLevels = Array.from(this.orderLevelMap.keys());

      for (let i = 0; i < existedOrderLevels.length; i += 1) {
        this.removeFnFromOrderLevel(x, existedOrderLevels[i]);
      }
    }

    this.rateLevelMap.delete(x);
    this.updateMinRateLevel();
  }

  executeFrameOrder(
    frameOrderLevel: FrameOrderLevel,
    timestamp = 0,
    deltaTime = 0,
    framesElapsed = 0,
  ) {
    if (!this.orderLevelMap.has(frameOrderLevel)) {
      return;
    }

    const fns = this.orderLevelMap.get(frameOrderLevel)!;

    for (let i = 0; i < fns.length; i += 1) {
      fns[i](timestamp, deltaTime, framesElapsed);
    }
  }

  tick(x: number = -1) {
    if (!this.playing) return;

    if (this.timestampBeforeWindowHidden !== -1) {
      this.accumulateTimeWhileWindowHidden
      += x - this.timestampBeforeWindowHidden;
      this.timestampBeforeWindowHidden = -1;
    }

    const deltaTime = x - (this.lastTickTime === -1 ? 0 : this.lastTickTime);

    // Here's a frame rate limiter, to prevent performance issue on mobile devices
    // that have a screen with high refresh rate.
    // The frame that is killed by the limiter won't be treaded as a valid tick,
    // so `this.lastTickTime` should NOT be triggered.
    if (deltaTime < this.maxPhase) {
      window.requestAnimationFrame(this.tick);
      return;
    }

    // From here, we can assume that the frame is a valid render frame, so we can
    // update the last tick time.
    this.updateLastTickTime(x);

    const timestamp = this.accumulateTime - this.accumulateTimeWhileWindowHidden;
    const framesElapsed = 1 + this.frameOfCycle;

    // Executing OD* tasks.
    if (
      (this.frameOfCycle > 0)
      || (this.frameOfCycle === 0 && this.minRateLevel === FrameRateLevel.D0)
    ) {
      for (let ODLevel = 1; ODLevel < 4; ODLevel += 1) {
        const frameAfterZero = this.frameOfCycle - 1;
        const ODLevelForThisFrame = frameAfterZero % ODLevel;
        if (ODLevelForThisFrame === 0) {
          this.executeFrameOrder(-ODLevel, timestamp, deltaTime, framesElapsed);
        }
      }
    }

    // Executing normal tasks.
    // If this is the last frame of the frame cycle, we need to execute
    // all the functions in the frame order greater than rate level, or
    // we only need to execute functions of current frame cycle.
    if (this.frameOfCycle < this.minRateLevel) {
      this.executeFrameOrder(
        this.frameOfCycle,
        timestamp,
        deltaTime,
        framesElapsed,
      );
      this.frameOfCycle += 1;
    } else {
      // Last frame of the frame cycle.
      for (let i = this.frameOfCycle; i < 4; i += 1) {
        this.executeFrameOrder(i, timestamp, deltaTime, framesElapsed);
      }
      this.frameOfCycle = 0;
    }

    window.requestAnimationFrame(this.tick);
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    window.requestAnimationFrame(this.tick);
  }

  pause() {
    this.playing = false;
    this.lastTickTime = -1;
  }

  stop() {
    this.pause();
    this.accumulateTime = 0;
    this.timestampBeforeWindowHidden = 0;
    this.accumulateTimeWhileWindowHidden = 0;
  }

  replay() {
    this.stop();
    window.requestAnimationFrame(this.play.bind(this));
  }

  dispose() {
    this.stop();
    this.rateLevelMap.clear();
    this.orderLevelMap.clear();
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    document.removeEventListener('pagehide', this.handleVisibilityChange);
  }
}
