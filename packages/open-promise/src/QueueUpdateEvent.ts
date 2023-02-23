import { QueueUpdateAction } from './QueueUpdateAction';

/**
 * Interface representing the details of a queue update event.
 */
interface IQueueUpdateEventDetail {
  /**
   * The number of tasks remaining in the queue.
   */
  remainTasks: number;
  /**
   * The number of tasks that were cleared from the queue.
   */
  clearedTasks: number;
  /**
   * The update action that was taken on the queue.
   */
  action: QueueUpdateAction;
}

/**
 * A custom event for updates to a queue.
 */
export class QueueUpdateEvent extends CustomEvent<IQueueUpdateEventDetail> {
  /**
   * Creates a new `QueueUpdateEvent` instance.
   * @param queue An object representing the state of the queue.
   * @param action The update action that was taken on the queue.
   */
  constructor(
    queue: { remainTasks: number; clearedTasks: number },
    action: QueueUpdateAction
  ) {
    super('update', {
      detail: {
        remainTasks: queue.remainTasks,
        clearedTasks: queue.clearedTasks,
        action,
      },
    });
  }
}
