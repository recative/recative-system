export interface ManagedCoreState<T = unknown> {
  id: string;
  managedStateExtensionId: string;
  spec: T;
}

export interface ManagedCoreStateTimeRangeTrigger<T>
  extends ManagedCoreState<T> {
  from: number;
  to: number;
}

export interface ManagedCoreStateTimePointTrigger<T>
  extends ManagedCoreState<T> {
  time: number;
  once: boolean;
}

export type ManagerCoreStateTrigger<T = unknown> =
  | ManagedCoreStateTimeRangeTrigger<T>
  | ManagedCoreStateTimePointTrigger<T>;
