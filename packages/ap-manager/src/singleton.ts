import { ApManager } from "./apManager";

let apManager: null | ApManager = null;

export const getApManager = (queueLength: number) => {
  if (!apManager) {
    apManager = new ApManager(queueLength);
  }

  return apManager;
}