type Any = any;

interface IDisposable extends Any {
  dispose(): void;
}

export interface IDestroyable extends Any {
  destroy(): void;
}

export class ResourceTracker {
  resources: Set<IDisposable>;

  constructor() {
    this.resources = new Set();
  }

  track(...resource: IDisposable[]) {
    for (let i = 0; i < resource.length; i += 1) {
      this.resources.add(resource[i]);
    }

    return resource;
  }

  unTrack(...resource: IDisposable[]) {
    for (let i = 0; i < resource.length; i += 1) {
      this.resources.delete(resource[i]);
    }
  }

  dispose() {
    const resources = Array.from(this.resources.values());
    for (let i = 0; i < resources.length; i += 1) {
      resources[i].dispose();
    }

    this.resources.clear();
  }
}

export class RuntimeSafeResourceTracker {
  resources: Set<any>;

  constructor() {
    this.resources = new Set();
  }

  track(resource: any) {
    if (resource.dispose && resource.dispose instanceof Function) {
      this.resources.add(resource);
    }
    return resource;
  }

  unTrack(resource: any) {
    this.resources.delete(resource);
  }

  dispose() {
    const resources = Array.from(this.resources.values());

    for (let i = 0; i < resources.length; i += 1) {
      resources[i].dispose();
    }

    this.resources.clear();
  }
}
