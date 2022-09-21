import debug from 'debug';
import EventTarget from '@ungap/event-target';

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

export enum SequentialQueueUpdateAction {
  /**
   * New task was added to the queue.
   */
  Add = 'add',
  /**
   * Some task was removed from the queue.
   */
  Remove = 'remove',
  /**
   * Some tasks was executed and removed from the queue.
   */
  Clear = 'clear',
  /**
   * All tasks was executed.
   */
  Drain = 'drain',
}

interface ISequentialQueueUpdateEventDetail {
  remainTasks: number;
  clearedTasks: number;
  action: SequentialQueueUpdateAction;
}

export class SequentialQueueUpdateEvent extends CustomEvent<ISequentialQueueUpdateEventDetail> {
  constructor(queue: SequentialQueue, action: SequentialQueueUpdateAction) {
    super('update', {
      detail: {
        remainTasks: queue.remainTasks,
        clearedTasks: queue.clearedTasks,
        action,
      }
    })
  }
}

export class SequentialQueue extends EventTarget {
  protected queue: Array<SequentialTask> = [];
  protected internalClearedTasks: number = 0;

  constructor(
    readonly concurrency: number = 1,
    readonly dependencyQueue?: SequentialQueue,
    public readonly queueId = Math.random().toString(36).substring(2),
  ) {
    super();
  }

  get remainTasks() {
    return this.queue.length;
  }

  get clearedTasks() {
    return this.internalClearedTasks;
  }

  add(task: SequentialTask) {
    this.dispatchEvent(
      new SequentialQueueUpdateEvent(this, SequentialQueueUpdateAction.Add)
    );
    this.queue.push(task);
  }

  remove(task: SequentialTask) {
    const index = this.queue.indexOf(task);
    if (index > -1) {
      this.queue.splice(index, 1);
    }

    this.dispatchEvent(
      new SequentialQueueUpdateEvent(this, SequentialQueueUpdateAction.Remove)
    );
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

    this.internalClearedTasks += taskCleared;
    this.dispatchEvent(
      new SequentialQueueUpdateEvent(this, SequentialQueueUpdateAction.Clear)
    );

    return allSettled(openPromiseTasks);
  }
}
