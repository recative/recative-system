import debug from 'debug';
import EventTarget from '@ungap/event-target';

import { allSettled } from './allSettled';
import { QueueUpdateEvent } from './QueueUpdateEvent';
import { QueueUpdateAction } from './QueueUpdateAction';
import { NotLazyOpenPromiseError } from './NotLazyOpenPromiseError';

import type { Queue, QueuedTask } from './types';
import type { OpenPromise } from './OpenPromise';

const log = debug('promise:seq-q');

export class SequentialQueue extends EventTarget {
  protected queue: Array<QueuedTask> = [];
  protected internalClearedTasks: number = 0;

  readonly taskMap = new Map<QueuedTask, string>();

  constructor(
    readonly concurrency: number = 1,
    readonly dependencyQueue?: Queue,
    public readonly queueId = Math.random().toString(36).substring(2)
  ) {
    super();
  }

  get remainTasks(): number {
    return this.queue.length;
  }

  get length() {
    return this.queue.length;
  }

  get clearedTasks() {
    return this.internalClearedTasks;
  }

  add(task: QueuedTask, taskId?: string) {
    this.dispatchEvent(new QueueUpdateEvent(this, QueueUpdateAction.Add));
    this.queue.push(task);

    if (taskId) {
      this.taskMap.set(task, taskId);
    }
  }

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
