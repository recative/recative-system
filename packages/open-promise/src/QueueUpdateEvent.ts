import { QueueUpdateAction } from './QueueUpdateAction';

interface IQueueUpdateEventDetail {
  remainTasks: number;
  clearedTasks: number;
  action: QueueUpdateAction;
}

export class QueueUpdateEvent extends CustomEvent<IQueueUpdateEventDetail> {
  constructor(queue: { remainTasks: number, clearedTasks: number }, action: QueueUpdateAction) {
    super('update', {
      detail: {
        remainTasks: queue.remainTasks,
        clearedTasks: queue.clearedTasks,
        action,
      },
    });
  }
}