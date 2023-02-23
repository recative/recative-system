import debug from 'debug';
import { FrameFillingQueue } from './FrameFillingQueue';

import { SequentialQueue } from './SequentialQueue';
import { now, timeRemaining, initializeTimeRemaining } from './timeRemaining';

import type { Queue, QueuedTask } from './types';

const log = debug('promise:time-slice');
const logGroup = debug('promise:time-slices');

logGroup.log = console.groupCollapsed.bind(console);

const MAX_TASK_DELAY_TIME = 2000;

export enum QueueType {
  Sequential = 'sequential',
  FrameFilling = 'frame-filling',
}

export class TimeSlicingQueue {
  running: boolean = false;

  private tickScheduled = false;

  private lastSuccessfulTickTime = 0;

  private queue: SequentialQueue | FrameFillingQueue;

  get taskMap() {
    return this.queue.taskMap;
  }

  get length() {
    return this.queue.length;
  }

  get remainTasks(): number {
    return this.queue.length;
  }

  constructor(
    readonly concurrency: number = 1,
    readonly type: QueueType = QueueType.FrameFilling,
    readonly protectedTime: number = 2,
    readonly dependencyQueue?: Queue,
    public readonly queueId = Math.random().toString(36).substring(2)
  ) {
    if (type === QueueType.FrameFilling) {
      this.queue = new SequentialQueue(concurrency, dependencyQueue, queueId);
    } else {
      this.queue = new FrameFillingQueue(
        concurrency,
        dependencyQueue,
        queueId,
        protectedTime
      );
    }

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

  add = (task: QueuedTask, taskId?: string) => {
    this.queue.add(task, taskId);

    if (this.running) {
      this.scheduleTick();
    }
  };

  private logRemainedTask = (title = `Remained Tasks`) => {
    logGroup(title);
    log(
      ['', ...[...this.queue.taskMap.values()].map((x) => `* ${x}`)].join(
        '\r\n'
      )
    );
    console.groupEnd();
  };

  private scheduleTick = () => {
    if (this.tickScheduled) {
      return;
    }

    this.tickScheduled = true;

    globalThis.requestAnimationFrame(() => {
      // log(`[${this.queueId}] New frame running`);
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
      this.logRemainedTask(
        `[${this.queueId}] [Force] Δt=${deltaT}, ${this.queue.length} in queue`
      );
      this.lastSuccessfulTickTime = currentTime;
      this.queue.tick().then(this.scheduleTick);
    } else if (deltaT > this.protectedTime) {
      this.logRemainedTask(
        `[${this.queueId}] Δt=${deltaT}, ${this.queue.length} in queue`
      );
      this.lastSuccessfulTickTime = currentTime;
      this.queue.tick().then(this.scheduleTick);
    } else if (this.queue.length > 0) {
      this.logRemainedTask(
        `[${this.queueId}] Δt=${deltaT}, protected time reached, scheduling next tick, ${this.queue.length} tasks delayed`
      );
      this.scheduleTick();
    }
  };

  stop = () => {
    this.running = false;
  };
}
