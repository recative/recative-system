/**
 * An enum representing different update actions that can be taken on a queue.
 */
export enum QueueUpdateAction {
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
