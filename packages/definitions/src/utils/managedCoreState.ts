import EventTarget from '@ungap/event-target';

import type {
  ManagedCoreState,
  ManagerCoreStateTrigger,
} from '../typings/client/managedCoreState';

const hasKey = <T extends object>(obj: T, k: keyof any): k is keyof T => k in obj;

const FreezedSet = <T>(x: Set<T>) => new Proxy(x, {
  get: (target, key) => {
    if (
      key === 'add'
      || key === 'get'
      || key === 'delete'
      || key === 'clear'
    ) {
      throw new Error('You cannot operate the state directly.');
    }

    const result = hasKey(target, key) ? target[key] : undefined;
    return result instanceof Function ? result.bind(target) : result;
  },
});

const FreezedMap = <T, P>(x: Map<T, P>) => new Proxy(x, {
  get: (target, key) => {
    if (
      key === 'set'
      || key === 'get'
      || key === 'delete'
      || key === 'clear'
    ) {
      throw new Error('You cannot operate the state directly.');
    }

    const result = hasKey(target, key) ? target[key] : undefined;
    return result instanceof Function ? result.bind(target) : result;
  },
});

export enum UpdateReason {
  Manually = 'manually',
  Tick = 'tick',
}

export class ManagedCoreStateManager extends EventTarget {
  /**
   * All registered managed state list.
   */
  private readonly states: Set<ManagedCoreStateList> = new Set();

  /**
   * Last update time of each managed state list.
   */
  private readonly stateUpdateTimeMap: Map<ManagedCoreStateList, number> = new Map();

  private readonly stateCache: Set<ManagedCoreState> = new Set();

  private readonly stateByIdCache: Map<string, ManagedCoreState> = new Map();

  private readonly stateByTypeCache: Map<string, Set<ManagedCoreState>> = new Map();

  /**
   * Current managed core state.
   */
  get state() {
    this.updateStateCache(false);
    return FreezedSet(this.stateCache);
  }

  /**
   * Current managed core state list.
   */
  readonly stateLists = FreezedSet(this.states);

  /**
   * Index of managed core state by state id.
   */
  readonly stateById = FreezedMap(this.stateByIdCache);

  /**
   * Index of managed core state by managed state extension id.
   */
  readonly stateByType = FreezedMap(this.stateByTypeCache);

  handleEvent = (event: CustomEvent) => {
    this.dispatchEvent(new CustomEvent(event.type, event));
  }

  /**
   * Add a new managed state list to the manager.
   * @param state The state list to be added.
   */
  addStateList = (state: ManagedCoreStateList) => {
    if (this.states.has(state)) {
      return;
    }
    this.states.add(state);
    this.stateUpdateTimeMap.set(state, -Infinity);
    this.updateStateCache(true);
    state.addEventListener('event', this.handleEvent as EventListener);
  };

  /**
   * Remove a managed state list from the manager.
   * @param state The state list to be removed.
   */
  removeStateList = (state: ManagedCoreStateList) => {
    if (!this.states.has(state)) {
      return;
    }
    this.states.delete(state);
    this.stateUpdateTimeMap.delete(state);
    this.updateStateCache(true);
    state.removeEventListener('event', this.handleEvent as EventListener);
  };

  /**
   * Clear all merged state of our cache.
   */
  private clearStateCache = () => {
    this.stateCache.clear();
    this.stateByIdCache.clear();
    this.stateByTypeCache.forEach((set) => {
      set.clear();
    });
  };

  /**
   * Update the state cache, pick all state from different state list, and merge
   * them to a cache.
   */
  private updateStateCache = (force?: boolean) => {
    if (!force && !this.ifManagerDirty()) return;

    const now = Date.now();

    this.clearStateCache();

    this.stateUpdateTimeMap.forEach((_, stateList) => {
      this.stateUpdateTimeMap.set(stateList, now);

      stateList.state.forEach((state) => {
        this.stateCache.add(state);
        this.stateByIdCache.set(state.id, state);

        let stateCategory = this.stateByTypeCache.get(
          state.managedStateExtensionId,
        );

        if (!stateCategory) {
          stateCategory = new Set();
          this.stateByTypeCache.set(
            state.managedStateExtensionId,
            stateCategory,
          );
        }

        stateCategory.add(state);
      });
    });
  };

  /**
   * Check if we need to merge the state list.
   * @returns If the manager is dirty.
   */
  private ifManagerDirty = () => {
    let isDirty = false;

    this.stateUpdateTimeMap.forEach((updateTime, stateList) => {
      if (isDirty) return;
      if (stateList.lastUpdateTime > updateTime) {
        isDirty = true;
      }
    });

    return isDirty;
  };
}

/**
 * Managed Core State List
 *
 * Managed core state stores data like BGM, subtitles, etc. these data will
 * change when the time is changed.
 *
 * The update of managed core state is triggered by triggers,
 *  * ManagedCoreStateTimeRangeTrigger: When the timeline enter the time range,
 *    the state will be added to the state list, when the timeline leave the
 *    time range, the state will be removed.
 *  * ManagedCoreStateTimePointTrigger: When the timeline passed the time point,
 *    the state will be triggered.
 *
 * States could be added or removed manually, call `addState` or `removeState`
 * to operate them.
 */
export class ManagedCoreStateList extends EventTarget {
  /**
   * Current managed core state list.
   */
  readonly state: Set<ManagedCoreState> = new Set();

  /**
   * Index of managed core state list by state id.
   */
  readonly stateById: Map<string, ManagedCoreState> = new Map();

  /**
   * Index of managed core state list by managed state extension id.
   */
  readonly stateByType: Map<string, Set<ManagedCoreState>> = new Map();

  /**
   * Core state triggers for current playing asset.
   */
  private triggers: ManagerCoreStateTrigger[] | null = null;

  /**
   * All states for current playing asset.
   */
  private statesForTriggers: Map<string, ManagedCoreState> = new Map();

  lastUpdateTime = Date.now();

  /**
   * Replace trigger list for current asset.
   * @param triggers - Core state configuration for current playing asset.
   */
  updateTriggers = (triggers: ManagerCoreStateTrigger[]) => {
    this.triggers = [...triggers];

    this.statesForTriggers.clear();
    this.triggers.forEach((item) => {
      this.statesForTriggers.set(item.id, {
        id: item.id,
        managedStateExtensionId: item.managedStateExtensionId,
        spec: item.spec,
      });
    });
  };

  /**
   * Remove triggers of managed core state list.
   */
  removeTriggers = () => {
    this.triggers = null;
    this.statesForTriggers.clear();
  };

  /**
   * Clear all states.
   */
  clearState = () => {
    this.lastUpdateTime = Date.now();
    this.state.clear();
    this.stateById.clear();
    this.stateByType.clear();
  };

  /**
   * Add a managed core state.
   * @param state - State to be added.
   */
  addState = (state: ManagedCoreState<unknown>) => {
    let stateCategory = this.stateByType.get(state.managedStateExtensionId);

    if (!stateCategory) {
      stateCategory = new Set();
      this.stateByType.set(state.managedStateExtensionId, stateCategory);
    }

    this.lastUpdateTime = Date.now();
    this.state.add(state);
    this.stateById.set(state.id, state);
    stateCategory.add(state);
  };

  /**
   * Remove a managed core state.
   * @param state - State to be removed.
   */
  deleteState = (state: ManagedCoreState<unknown>) => {
    this.lastUpdateTime = Date.now();
    this.state.delete(state);
    this.stateById.delete(state.id);
    this.stateByType.get(state.managedStateExtensionId)?.delete(state);
  };

  private triggeredStates = new Set<ManagerCoreStateTrigger>();

  /**
   * Seek managed core state list for current asset.
   * @param time - Current playing time.
   */
  seek = (time: number, reason: UpdateReason) => {
    if (!this.triggers) return false;

    const lastHash = [...this.stateById.keys()].join();
    this.clearState();

    let eventTriggered = false;

    this.triggers.forEach((trigger) => {
      if ('from' in trigger) {
        const state = this.statesForTriggers.get(trigger.id);

        if (!state) {
          throw new Error(`Could not find state with id ${trigger.id}`);
        }

        if (time >= trigger.from && time <= trigger.to) {
          this.addState(state);
        }
      } else {
        if (!trigger.triggerWhenManuallySeek && reason === UpdateReason.Manually) {
          return;
        }

        if (time >= trigger.time && this.lastUpdateTime <= trigger.time) {
          if (!this.triggeredStates.has(trigger) && trigger.once) {
            return;
          }

          this.dispatchEvent(new CustomEvent('event', {
            detail: {
              trigger,
              list: this
            }
          }));
          this.triggeredStates.add(trigger);
          eventTriggered = true;
        }
      }
    });

    const thisHash = [...this.stateById.keys()].join();

    const dirty = lastHash !== thisHash;

    if (dirty || eventTriggered) {
      this.lastUpdateTime = Date.now();
    }

    return dirty;
  };
}
