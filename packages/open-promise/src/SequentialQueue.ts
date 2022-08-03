import debug from 'debug';

import { OpenPromise } from './OpenPromise';
import { allSettled } from './allSettled';

const log = debug('promise:seq-q');

export type SequentialTask = (() => void) | OpenPromise<any>;

export class NotLazyOpenPromiseError extends Error {
  name = 'NotLazyOpenPromiseError';

  constructor() {
    super('OpenPromise must be lazy');
  }
}

export class SequentialQueue {
  protected queue: Array<SequentialTask> = [];

  constructor(
    readonly concurrency: number = 1,
    readonly dependencyQueue?: SequentialQueue,
    public readonly queueId = Math.random().toString(36).substring(2),
  ) {}

  get remainTasks() {
    return this.queue.length;
  }

  add(task: SequentialTask) {
    this.queue.push(task);
  }

  remove(task: SequentialTask) {
    const index = this.queue.indexOf(task);
    if (index > -1) {
      this.queue.splice(index, 1);
    }
  }

  tick() {
    const openPromiseTasks: OpenPromise<any>[] = [];

    if (this.dependencyQueue && this.dependencyQueue.remainTasks !== 0) {
      return allSettled(openPromiseTasks);
    }

    let taskCleared = 0;

    for (let i = 0; i < this.concurrency; i += 1) {
      taskCleared += 1;
      const task = this.queue.shift();

      if (task) {
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

    return allSettled(openPromiseTasks);
  }
}
