import debug from 'debug';
import EventTarget from '@ungap/event-target';

import { allSettled } from './allSettled';
import { QueueUpdateEvent } from './QueueUpdateEvent';
import { QueueUpdateAction } from './QueueUpdateAction';
import { NotLazyOpenPromiseError } from './NotLazyOpenPromiseError';

import type { Queue, QueuedTask } from './types';
import type { OpenPromise } from './OpenPromise';

const log = debug('promise:seq-q');

/**
 * SequentialQueue is a queue of tasks that executes tasks in sequence up to a
 * certain concurrency limit.
 * Tasks can be either a synchronous function or an OpenPromise (a lazy promise
 * that will only execute when executed).
 *
 * @typeparam T The type of the result produced by the OpenPromise task.
 */
export class SequentialQueue extends EventTarget {
  /**
   * The queue of tasks to execute.
   */
  protected queue: Array<QueuedTask> = [];
  /**
   * The number of tasks that have been cleared from the queue.
   */
  protected internalClearedTasks: number = 0;

  /**
   * A map of QueuedTask objects to their associated task IDs.
   */
  readonly taskMap = new Map<QueuedTask, string>();

  /**
   * Creates a new SequentialQueue object.
   *
   * @param concurrency The number of tasks to execute concurrently.
   *   Defaults to 1.
   * @param dependencyQueue A queue of tasks that must complete before tasks in
   *   this queue can be executed. Defaults to undefined.
   * @param queueId An optional ID for this queue. If not specified, a random ID
   *   will be generated.
   */
  constructor(
    readonly concurrency: number = 1,
    readonly dependencyQueue?: Queue,
    public readonly queueId = Math.random().toString(36).substring(2)
  ) {
    super();
  }

  /**
   * Returns the number of tasks remaining in the queue.
   */
  get remainTasks(): number {
    return this.queue.length;
  }

  /**
   * Returns the number of tasks in the queue.
   */
  get length() {
    return this.queue.length;
  }

  /**
   * Returns the number of tasks that have been cleared from the queue.
   */
  get clearedTasks() {
    return this.internalClearedTasks;
  }

  /**
   * Adds a task to the queue.
   *
   * @param task The task to add to the queue.
   * @param taskId An optional ID for the task. If specified, the task will be
   * added to the taskMap with this ID.
   */
  add(task: QueuedTask, taskId?: string) {
    this.dispatchEvent(new QueueUpdateEvent(this, QueueUpdateAction.Add));
    this.queue.push(task);

    if (taskId) {
      this.taskMap.set(task, taskId);
    }
  }

  /**
   * Removes a task from the queue.
   *
   * @param task The task to remove from the queue.
   */
  remove(task: QueuedTask) {
    const index = this.queue.indexOf(task);
    if (index > -1) {
      this.queue.splice(index, 1);
    }

    if (this.taskMap.has(task)) {
      this.taskMap.delete(task);
    }

    this.dispatchEvent(new QueueUpdateEvent(this, QueueUpdateAction.Remove));
  }

  /**
   * Executes the next set of tasks in the queue, up to the concurrency limit.
   * If a dependencyQueue is provided and has remaining tasks, the method
   * returns immediately without executing any tasks.
   * Returns a Promise that resolves with an array of results from any
   * OpenPromise tasks that were executed during this tick.
   */
  tick() {
    const openPromiseTasks: OpenPromise<any>[] = [];

    if (this.dependencyQueue && this.dependencyQueue.remainTasks !== 0) {
      log(
        `[${this.queueId}] Waiting for the dependency queue with ${this.dependencyQueue.remainTasks} tasks.`
      );
      return Promise.resolve([]);
    }

    let taskCleared = 0;

    for (let i = 0; i < this.concurrency; i += 1) {
      taskCleared += 1;
      const task = this.queue.shift();

      if (task) {
        if (this.taskMap.has(task)) {
          this.taskMap.delete(task);
        }

        if ('execute' in task) {
          if (!task.lazy) {
            throw new NotLazyOpenPromiseError();
          }
          task.execute();
          openPromiseTasks.push(task);
        } else {
          task();
        }
      }
    }

    if (taskCleared > 0) {
      log(`[${this.queueId}] ${taskCleared} task cleared.`);
    }

    this.internalClearedTasks += taskCleared;
    this.dispatchEvent(new QueueUpdateEvent(this, QueueUpdateAction.Clear));

    return allSettled(openPromiseTasks);
  }
}
