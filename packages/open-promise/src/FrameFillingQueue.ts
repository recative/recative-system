import debug from 'debug';
import EventTarget from '@ungap/event-target';

import { allSettled } from './allSettled';
import { timeRemaining } from './timeRemaining';
import { QueueUpdateEvent } from './QueueUpdateEvent';
import { QueueUpdateAction } from './QueueUpdateAction';
import { Queue, QueuedTask } from './types';
import { NotLazyOpenPromiseError } from './NotLazyOpenPromiseError';

const log = debug('promise:par-q');

export class FrameFillingQueue extends EventTarget {
  private queue: Array<QueuedTask> = [];

  readonly taskMap = new Map<QueuedTask, string>();

  clearedTasks = 0;

  get remainTasks(): number {
    return this.queue.length;
  }

  constructor(
    readonly concurrent = 1,
    readonly dependencyQueue?: Queue,
    public readonly queueId = Math.random().toString(36).substring(2),
    readonly protectedTime: number = 2
  ) {
    super();
  }

  get length() {
    return this.queue.length;
  }

  add = (task: QueuedTask, taskId?: string) => {
    this.dispatchEvent(new QueueUpdateEvent(this, QueueUpdateAction.Add));
    this.queue.push(task);

    if (taskId) {
      this.taskMap.set(task, taskId);
    }

    this.tick();
  };

  rejected = 0;

  resolved = 0;

  working = 0;

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

  private handlePromise = (
    p: Promise<unknown>,
    results: Promise<unknown>[]
  ) => {
    this.working += 1;

    return p
      .then(() => {
        this.resolved += 1;
      })
      .catch(() => {
        this.rejected += 1;
      })
      .finally(() => {
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
      });
  };

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
