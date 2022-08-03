import debug from 'debug';
import { atom } from 'nanostores';

import { allSettled, OpenPromise, TimeSlicingQueue } from '@recative/open-promise';
import {
  IResourceFileForClient,
  PreloadLevel,
  ResourceLoaderCacheLevel,
} from '@recative/definitions';

import { isNotNullable } from '../../utils/isNullable';

import type { Core } from '../../core';

const log = debug('core:preload');

export class PreloadManager {
  readonly urlCached = atom(false);

  readonly urlCacheScheduled = atom(false);

  readonly blockingResourceCached = atom(false);

  readonly blockingResourceCacheScheduled = atom(false);

  readonly nonBlockingResourceCached = atom(false);

  readonly nonBlockingResourceCacheScheduled = atom(false);

  constructor(private core: Core) {}

  private ensureEpisodeData = () => {
    const episodeData = this.core.getEpisodeData();

    if (!episodeData) {
      throw new TypeError('Episode data is not available.');
    }

    return episodeData;
  };

  cacheAllResourceFileUrl = async () => {
    if (this.urlCacheScheduled.get()) {
      return;
    }

    this.urlCacheScheduled.set(true);

    log('URL cache scheduled');

    const episodeData = this.ensureEpisodeData();

    const resourceFiles = [...episodeData.resources.resourceFiles]
      .filter(PreloadManager.blockingFileFilter);

    log(`Caching URL (${resourceFiles.length}): ${resourceFiles.map((x) => `${x.label} (${x.id.substring(0, 5)})`).join(', ')}`);
    const tasks = resourceFiles
      .map((x) => episodeData.resources.getResourceById(x.id))
      .filter(isNotNullable);

    await allSettled(tasks);

    log('URL cache finished');

    this.urlCached.set(true);
  };

  private fetchSingleFile = (
    resource: IResourceFileForClient,
    taskQueue: TimeSlicingQueue = this.core.fastTaskQueue,
    reason = 'unknown',
  ) => {
    const episodeData = this.ensureEpisodeData();
    return episodeData.resources.getResourceById(
      resource.id,
      null,
      undefined,
      (url) => {
        const task = new OpenPromise<string | null>((resolve) => {
          log(`Preloading ${resource.label}(${resource.id}), reason: ${reason}`);
          this.core.resourceLoader
            .fetchResource({
              id: resource.id,
              url,
              cacheLevel: resource.cacheToHardDisk
                ? ResourceLoaderCacheLevel.Idb
                : ResourceLoaderCacheLevel.FetchCache,
            })
            .then(() => resolve(url))
            .catch(() => resolve(null))
            .finally(() => {
              log(`Preload ${resource.label}(${resource.id}) finished`);
            });
        }, true);

        taskQueue.add(task);

        return task.promise;
      },
    );
  };

  private static blockingFileFilter = (resource: IResourceFileForClient) => {
    if (resource.preloadLevel === PreloadLevel.BeforeApp) return true;
    if (resource.preloadLevel === PreloadLevel.BeforeEpisode) return true;
    return false;
  };

  private static nonBlockingFileFilter = (resource: IResourceFileForClient) => {
    if (resource.preloadLevel === PreloadLevel.AfterEpisode) return true;
    if (resource.preloadLevel === PreloadLevel.AfterApp) return true;
    return false;
  };

  fetchBlockingResources = async () => {
    if (this.blockingResourceCacheScheduled.get()) {
      return;
    }

    this.blockingResourceCacheScheduled.set(true);

    log('Blocking resources scheduled');

    const episodeData = this.ensureEpisodeData();
    const resourceFiles = [...episodeData.resources.resourceFiles];

    const blockingResources = resourceFiles
      .filter(PreloadManager.blockingFileFilter);

    log(`Blocking resources (${blockingResources.length}): ${blockingResources.map((x) => `${x.label} (${x.id.substring(0, 5)})`).join(', ')}`);
    const tasks = resourceFiles
      .filter(PreloadManager.blockingFileFilter)
      .map((x) => this.fetchSingleFile(x, this.core.fastTaskQueue, 'blocking'))
      .filter(isNotNullable);

    await allSettled(tasks);

    log('Blocking resources finished');
    this.blockingResourceCached.set(true);
  };

  fetchNonBlockingResources = async () => {
    if (this.nonBlockingResourceCacheScheduled.get()) {
      return;
    }

    this.nonBlockingResourceCacheScheduled.set(true);

    log('Non-blocking resources scheduled');

    const episodeData = this.ensureEpisodeData();

    const resourceFiles = [...episodeData.resources.resourceFiles];

    const tasks = resourceFiles
      .filter(PreloadManager.nonBlockingFileFilter)
      .map((x) => this.fetchSingleFile(x, this.core.slowTaskQueue, 'non-blocking'))
      .filter(isNotNullable);

    await allSettled(tasks);

    log('Non-blocking resources finished');
    this.nonBlockingResourceCached.set(true);
  };
}
