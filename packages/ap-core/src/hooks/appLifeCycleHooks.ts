import {
  CONNECTED_THREE_APP,
  IConnectedThreeAppEventDetail,
} from '../core/pixiThreeConnector';
import { DESTROYED_APP } from '../core/pixiApp';

import { useEventTarget, useStore } from './baseHooks';

export const useThreeAppConnectCallback = (
  fn: (x: IConnectedThreeAppEventDetail) => void,
) => {
  const [getConnectedThreeApp, , subscribeConnectedThreeAppUpdate] = useStore(CONNECTED_THREE_APP);
  const current = getConnectedThreeApp();
  if (current !== null) {
    fn(current);
  }
  subscribeConnectedThreeAppUpdate((data) => fn(data!));
};

export const useAppDestroyCallback = (fn: () => void) => {
  const eventTarget = useEventTarget();
  eventTarget.on(DESTROYED_APP, () => {
    fn();
  });
};
