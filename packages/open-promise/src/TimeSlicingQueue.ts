import debug from 'debug';
import { FrameFillingQueue } from './FrameFillingQueue';

import { SequentialQueue } from './SequentialQueue';
import { now, timeRemaining, initializeTimeRemaining } from './timeRemaining';

import type { Queue, QueuedTask } from './types';

const log = debug('promise:time-slice');
const logGroup = debug('promise:time-slices');

logGroup.log = console.groupCollapsed.bind(console);

const MAX_TASK_DELAY_TIME = 2000;

/**
 * The `QueueType` enum represents the two types of queues that can be used in
 * the `TimeSlicingQueue` class:
 * a sequential queue or a frame-filling queue.
 */
export enum QueueType {
  Sequential = 'sequential',
  FrameFilling = 'frame-filling',
}

/**
 * The `TimeSlicingQueue` class is a task queue that schedules tasks to run
 * at a later time to avoid blocking the main thread.
 *
 * @template T The type of the queued tasks.
 */
export class TimeSlicingQueue {
  /**
   * A flag indicating whether the queue is currently running.
   */
  running: boolean = false;

  /**
   * Indicates whether a tick has been scheduled.
   *
   * @private
   */
  private tickScheduled = false;

  /**
   * The time of the last successful tick.
   *
   * @private
   */
  private lastSuccessfulTickTime = 0;

  /**
   * The queue used to store tasks.
   *
   * @private
   */
  private queue: SequentialQueue | FrameFillingQueue;

  /**
   * Returns a map of the tasks in the queue and their corresponding IDs.
   */
  get taskMap() {
    return this.queue.taskMap;
  }

  /**
   * Returns the number of tasks in the queue.
   */
  get length() {
    return this.queue.length;
  }

  /**
   * Returns the number of tasks in the queue.
   *
   * This property is identical to `length` and is provided for
   * compatibility with the `Queue` interface.
   */
  get remainTasks(): number {
    return this.queue.length;
  }

  /**
   * Constructs a new `TimeSlicingQueue` object.
   *
   * @param concurrency The maximum number of tasks that can be run
   *   concurrently.
   * @param type The type of the queue to use: either a sequential queue or a
   *   frame-filling queue.
   * @param protectedTime The minimum amount of time (in milliseconds) between
   *   ticks to ensure that the main thread is not blocked.
   * @param dependencyQueue A dependency queue to use.
   * @param queueId An optional ID to use for the queue.
   */
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

  /**
   * Runs the queue.
   */
  run = () => {
    if (this.running) {
      return;
    }

    this.running = true;

    this.scheduleTick();
  };

  /**
   * Adds a task to the queue.
   * @param task The task to add.
   * @param taskId An optional ID to assign to the task.
   */
  add = (task: QueuedTask, taskId?: string) => {
    this.queue.add(task, taskId);

    if (this.running) {
      this.scheduleTick();
    }
  };

  /**
   * Logs the tasks that are still in the queue.
   *
   * @private
   * @param title The title of the log.
   */
  private logRemainedTask = (title = `Remained Tasks`) => {
    logGroup(title);
    log(
      ['', ...[...this.queue.taskMap.values()].map((x) => `* ${x}`)].join(
        '\r\n'
      )
    );
    console.groupEnd();
  };

  /**
   * Schedules a tick to process the next task in the queue.
   *
   * @private
   */
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

  /**
   * Processes the next task in the queue.
   *
   * @private
   */
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

  /**
   * Stops the queue.
   */
  stop = () => {
    this.running = false;
  };
}
