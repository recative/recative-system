import debug from 'debug';
import EventTarget from '@ungap/event-target';

import { allSettled } from './allSettled';
import { timeRemaining } from './timeRemaining';
import { QueueUpdateEvent } from './QueueUpdateEvent';
import { QueueUpdateAction } from './QueueUpdateAction';
import { Queue, QueuedTask } from './types';
import { NotLazyOpenPromiseError } from './NotLazyOpenPromiseError';

const log = debug('promise:par-q');

/**
 * A queue that processes tasks asynchronously in frames.
 */
export class FrameFillingQueue extends EventTarget {
  /**
   * The tasks currently in the queue.
   */
  private queue: Array<QueuedTask> = [];

  /**
   * A map of tasks to their unique identifiers.
   */
  readonly taskMap = new Map<QueuedTask, string>();

  /**
   * The number of cleared tasks.
   */
  clearedTasks = 0;

  /**
   * The number of rejected promises.
   */
  rejected = 0;

  /**
   * The number of resolved promises.
   */
  resolved = 0;

  /**
   * The number of tasks currently being processed.
   */
  working = 0;

  /**
   * Returns the number of remaining tasks in the queue.
   */
  get remainTasks(): number {
    return this.queue.length;
  }

  /**
   * Creates a new instance of `FrameFillingQueue`.
   *
   * @param concurrent - The maximum number of tasks to execute concurrently.
   * @param dependencyQueue - An optional dependency queue that must be empty
   *   before tasks in this queue can be executed.
   * @param queueId - An optional unique identifier for the queue.
   * @param protectedTime - The amount of time (in milliseconds) that must
   *   remain in the current frame before the next task can be executed.
   */
  constructor(
    readonly concurrent = 1,
    readonly dependencyQueue?: Queue,
    public readonly queueId = Math.random().toString(36).substring(2),
    readonly protectedTime: number = 2
  ) {
    super();
  }

  /**
   * The number of tasks in the queue.
   */
  get length() {
    return this.queue.length;
  }

  /**
   * Adds a task to the queue.
   *
   * @param task - The task to add to the queue.
   * @param taskId - An optional unique identifier for the task.
   */
  add = (task: QueuedTask, taskId?: string) => {
    this.dispatchEvent(new QueueUpdateEvent(this, QueueUpdateAction.Add));
    this.queue.push(task);

    if (taskId) {
      this.taskMap.set(task, taskId);
    }

    this.tick();
  };

  /**
   * Removes a task from the queue.
   *
   * @param task - The task to remove from the queue.
   * @param silent - An optional flag to indicate whether to suppress the
   *   `QueueUpdateEvent`.
   */
  remove(task: QueuedTask, silent?: boolean) {
    const index = this.queue.indexOf(task);
    if (index > -1) {
      this.queue.splice(index, 1);
    }

    if (this.taskMap.has(task)) {
      this.taskMap.delete(task);
    }

    if (!silent) {
      this.dispatchEvent(new QueueUpdateEvent(this, QueueUpdateAction.Remove));
    }
  }

  /**
   * Executes a task and returns a promise that resolves when the task is
   * complete.
   *
   * @param task - The task to execute.
   */
  private executeTask = (task: QueuedTask): Promise<any> => {
    this.remove(task, true);

    if ('execute' in task) {
      if (!task.lazy) {
        throw new NotLazyOpenPromiseError();
      }
      task.execute();
      return task;
    }

    return Promise.resolve(task());
  };

  /**
   * Handles a promise in the queue, updating the relevant counters and
   * triggering the execution of the next task if the concurrency limit allows
   * it.
   *
   * @param p - The promise to handle.
   * @param results - An array to which the promise will be pushed.
   * @returns A promise that resolves when the input promise has settled.
   */
  private handlePromise = async (
    p: Promise<unknown>,
    results: Promise<unknown>[]
  ) => {
    this.working += 1;

    try {
      try {
        await p;
        this.resolved += 1;
      } catch {
        this.rejected += 1;
      }
    } finally {
      this.clearedTasks += 1;
      this.working -= 1;

      const deltaT = timeRemaining();

      if (
        this.queue.length &&
        this.working < this.concurrent &&
        deltaT > this.protectedTime
      ) {
        const promise = this.executeTask(this.queue[0]);
        results.push(promise);
        this.handlePromise(promise, results);
      }
    }
  };

  /**
   * Executes the next available task in the queue. If the queue is not empty
   * and the number of working tasks is less than `concurrent`, a task will be
   * removed from the queue and executed.
   *
   * @returns A promise that resolves when all tasks have completed.
   */
  tick = () => {
    if (this.dependencyQueue && this.dependencyQueue.remainTasks !== 0) {
      log(
        `[${this.queueId}] Waiting for the dependency queue with ${this.dependencyQueue.remainTasks} tasks.`
      );
      return Promise.resolve([]);
    }

    if (this.working > 0) return Promise.resolve([]);

    const results: Promise<unknown>[] = [];
    for (let i = 0; i < Math.min(this.queue.length, this.concurrent); i += 1) {
      const promise = this.executeTask(this.queue[i]);
      results.push(promise);
      this.handlePromise(promise, results);
    }

    return allSettled(results);
  };
}
