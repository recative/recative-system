import debug from 'debug';

import {
  now,
  timeRemaining,
  initializeTimeRemaining,
} from './timeRemaining';
import { SequentialQueue } from './SequentialQueue';

import type { SequentialTask } from './SequentialQueue';

const log = debug('promise:time-slice');

const MAX_TASK_DELAY_TIME = 2000;

export class TimeSlicingQueue extends SequentialQueue {
  running: boolean = false;

  private tickScheduled = false;

  private lastSuccessfulTickTime = 0;

  constructor(
    readonly concurrency: number = 1,
    readonly protectedTime: number = 2,
    readonly dependencyQueue?: SequentialQueue | TimeSlicingQueue,
    public readonly queueId = Math.random().toString(36).substring(2),
  ) {
    super(concurrency, dependencyQueue, queueId);

    initializeTimeRemaining();
    log(`[${this.queueId}] initialized`);
  }

  run = () => {
    if (this.running) {
      return;
    }

    this.running = true;

    this.scheduleTick();
  };

  add = (task: SequentialTask) => {
    super.add(task);

    if (this.running) {
      this.scheduleTick();
    }
  };

  private scheduleTick = () => {
    if (this.tickScheduled) {
      return;
    }

    this.tickScheduled = true;

    globalThis.requestAnimationFrame(() => {
      log(`[${this.queueId}] New frame running`);
      this.tickScheduled = false;
      this.tickOnce();
    });
  };

  private tickOnce = () => {
    if (!this.running) {
      log(`[${this.queueId}] queue is not running, won't tick`);
      return;
    }

    if (!this.queue.length) {
      log(`[${this.queueId}] Task queue drained`);
      return;
    }

    const deltaT = timeRemaining();
    const currentTime = now();

    if (currentTime - this.lastSuccessfulTickTime > MAX_TASK_DELAY_TIME) {
      log(`[${this.queueId}] [Force] Δt=${deltaT}, ${this.queue.length} in queue`);
      this.lastSuccessfulTickTime = currentTime;
      this.tick().then(this.scheduleTick);
    } else if (deltaT > this.protectedTime) {
      log(`[${this.queueId}] Δt=${deltaT}, ${this.queue.length} in queue`);
      this.lastSuccessfulTickTime = currentTime;
      this.tick().then(this.scheduleTick);
    } else if (this.queue.length > 0) {
      log(`[${this.queueId}] Δt=${deltaT}, protected time reached, scheduling next tick, ${this.queue.length} tasks delayed`);
      this.scheduleTick();
    }
  };

  stop = () => {
    this.running = false;
  };
}
