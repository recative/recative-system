/* eslint-disable max-classes-per-file */
import { OpenPromise, OpenPromiseState } from '@recative/open-promise';
import type { ContentInstance, InstanceOption } from '../../instance';

export class TaskAlreadyAddedError extends Error {
  name = 'TaskAlreadyAdded';

  constructor(taskId: string) {
    super(`Task with id "${taskId}" was already added to the task queue`);
  }
}

export class RunTaskInDestroyedTaskQueueManagerError extends Error {
  name = 'RunTaskInDestroyedTaskQueueManager';

  constructor(taskId: string) {
    super(`Task queue manager was destroyed, unable to execute tasks "${taskId}" registered inside the queue.`);
  }
}

export class TaskQueueManagerDestroyedError extends Error {
  name = 'TaskQueueManagerDestroyed';

  constructor() {
    super('Task queue manager destroyed, would not run this task');
  }
}

export class TaskQueueManager {
  private destroyed = false;

  private tasks = new Map<string, OpenPromise<void>>();

  constructor(
    private instance: ContentInstance,
    private instanceOptions: InstanceOption,
  ) {

  }

  requireQueuedTask(taskId: string) {
    if (this.tasks.has(taskId)) {
      throw new TaskAlreadyAddedError(taskId);
    }

    const task = new OpenPromise<void>((resolve, reject) => {
      if (this.destroyed) {
        return reject(new RunTaskInDestroyedTaskQueueManagerError(taskId));
      }

      const component = this.instanceOptions.getComponent(this.instance.id);
      if (!component) {
        return reject(new TypeError('Component not found'));
      }

      if (!component.runQueuedTask) {
        return resolve();
      }

      return component.runQueuedTask(taskId).finally(() => {
        resolve();
      });
    }, true);

    this.instanceOptions.taskQueue.add(task, `queued-task:${taskId}`);
    task.promise.finally(() => {
      this.tasks.delete(taskId);
    });
  }

  destroy() {
    [...this.tasks.values()].forEach((x) => {
      this.instanceOptions.taskQueue.remove(x);

      if (x.state === OpenPromiseState.Idle) {
        x.reject(new TaskQueueManagerDestroyedError());
      }
    });
  }
}
