import { AtomName } from './AtomStore';

export class RemoteStoreRegistry {
  private registeredRemoteStore: Record<string, AtomName<any>> = {};

  register(slotId: string, atomName: AtomName<any>) {
    this.registeredRemoteStore[slotId] = atomName;
  }

  deregister(slotId: string) {
    delete this.registeredRemoteStore[slotId];
  }

  getAtom(slotId: string) {
    return this.registeredRemoteStore[slotId];
  }

  dispose() {
    Object.keys(this.registeredRemoteStore).forEach((x) => {
      delete this.registeredRemoteStore[x];
    });
  }
}
