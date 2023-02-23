import { createStore, get, set, UseStore } from 'idb-keyval';
import { ResourceLoaderCacheLevel } from '@recative/definitions';
import { OpenPromise, OpenPromiseState } from '@recative/open-promise';

interface IResourceLoaderItem {
  id: string;
  url: string;
  cacheLevel?: ResourceLoaderCacheLevel;
}

interface IProgress {
  resolved: boolean;
  progress: number;
  id: string;
}

interface IFetchPromise {
  promise: OpenPromise<Blob>;
  progress: number;
}

export class ResourceLoader {
  private static instance: ResourceLoader;

  private idb: UseStore;

  private fetchPromiseMap: Record<string, IFetchPromise> = {};

  private resourceMemoryMap: Record<string, Blob> = {};

  private constructor() {
    this.idb = createStore('recative-resource-loader', 'cache');
  }

  static getInstance() {
    if (!this.instance) this.instance = new ResourceLoader();
    return this.instance;
  }

  public addResource = (resource: IResourceLoaderItem): void => {
    if (!this.fetchPromiseMap[resource.id]) {
      this.fetchPromiseMap[resource.id] = {
        promise: this.fetchGenerator(resource),
        progress: 0,
      };
    }
  };

  public fetchResource = (resource: IResourceLoaderItem): Promise<Blob> => {
    if (
      this.fetchPromiseMap[resource.id] &&
      this.fetchPromiseMap[resource.id].promise.state ===
        OpenPromiseState.Rejected
    ) {
      this.fetchPromiseMap[resource.id] = {
        promise: this.fetchGenerator(resource),
        progress: 0,
      };
    } else {
      this.addResource(resource);
    }
    return this.getResource(resource.id);
  };

  public getResource = async (id: string): Promise<Blob> => {
    // memory
    if (this.resourceMemoryMap[id]) {
      return this.resourceMemoryMap[id];
    }
    // cache
    const cacheBlob = await get(id, this.idb);
    if (cacheBlob !== undefined) {
      this.resourceMemoryMap[id] = cacheBlob;
      return cacheBlob;
    }
    if (this.fetchPromiseMap[id]) {
      // fetch
      return this.fetchPromiseMap[id].promise;
    }
    // error
    throw new Error('not found');
  };

  private fetchGenerator = (resource: IResourceLoaderItem): OpenPromise<Blob> =>
    new OpenPromise(async (resolve, reject) => {
      try {
        resolve(await this.fetch(resource));
      } catch (error) {
        reject(error as Error);
      }
    });

  public getProgress = (idList?: string[]): IProgress[] => {
    const progressList: IProgress[] = [];
    idList?.forEach((id) => {
      if (this.fetchPromiseMap[id]) {
        const progress: IProgress = { id, resolved: false, progress: 0 };
        switch (this.fetchPromiseMap[id].promise.state) {
          case OpenPromiseState.Pending:
            break;
          case OpenPromiseState.Fulfilled:
            progress.resolved = true;
            progress.progress = 100;
            break;
          case OpenPromiseState.Rejected:
            progress.resolved = false;
            break;
          default:
            break;
        }
        progressList.push(progress);
      }
    });
    return progressList;
  };

  // eslint-disable-next-line class-methods-use-this
  private fetch = async (resource: IResourceLoaderItem): Promise<Blob> =>
    new Promise((topResolve, topReject) => {
      const abort = new AbortController();
      Promise.race([
        new Promise<Response>((_, reject) => {
          setTimeout(() => {
            abort.abort();
            topReject(new Error('timeout'));
            reject();
          }, 60 * 1000);
        }),
        fetch(resource.url, {
          signal: abort.signal,
        }),
      ])
        .then(async (response) => {
          if (response.body) {
            const contentLength = Number(
              response.headers.get('Content-Length')
            );
            let receivedLength = 0;
            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            // eslint-disable-next-line no-constant-condition
            while (true) {
              try {
                // eslint-disable-next-line no-await-in-loop
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                  chunks.push(value);
                  receivedLength += value.length;
                }
                if (contentLength > 0 && this.fetchPromiseMap[resource.id]) {
                  this.fetchPromiseMap[resource.id].progress =
                    receivedLength / contentLength;
                }
              } catch (error) {
                abort.abort();
                return;
              }
            }
            const blob = new Blob(chunks);
            switch (resource.cacheLevel) {
              case ResourceLoaderCacheLevel.Idb:
                try {
                  await set(resource.id, blob);
                  // eslint-disable-next-line no-empty
                } catch (error) {}
                break;
              // eslint-disable-next-line no-fallthrough
              case ResourceLoaderCacheLevel.Memory:
                this.resourceMemoryMap[resource.id] = blob;
                break;
              default:
              case ResourceLoaderCacheLevel.FetchCache:
                break;
            }
            topResolve(blob);
          } else {
            throw new Error('fetch error');
          }
        })
        .catch((error) => {
          topReject(error);
        });
    });
}
