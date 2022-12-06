import debug from 'debug';
import { atom } from 'nanostores';

import {
  allSettled,
  OpenPromise,
  TimeSlicingQueue,
} from '@recative/open-promise';
import {
  IResourceFileForClient,
  PreloadLevel,
  ResourceLoaderCacheLevel,
} from '@recative/definitions';

import { isNotNullable } from '../../utils/isNullable';

import type { EpisodeCore } from '../../episodeCore';
import { PostProcessCallback } from '../../utils/tryValidResourceUrl';

const log = debug('core:preload');

export class PreloadManager {
  readonly urlCached = atom(false);

  readonly urlCacheScheduled = atom(false);

  readonly blockingResourceCached = atom(false);

  readonly blockingResourceCacheScheduled = atom(false);

  readonly nonBlockingResourceCached = atom(false);

  readonly nonBlockingResourceCacheScheduled = atom(false);

  constructor(private core: EpisodeCore) {}

  private ensureEpisodeData = () => {
    const episodeData = this.core.getEpisodeData();

    if (!episodeData) {
      throw new TypeError('Episode data is not available.');
    }

    return episodeData;
  };

  cacheAllResourceFileUrl = async () => {
    performance.mark('cacheResourceFileUrl-start');
    if (this.urlCacheScheduled.get()) {
      return;
    }

    this.urlCacheScheduled.set(true);

    const episodeData = this.ensureEpisodeData();

    const resourceFiles = [...episodeData.resources.resourceFiles].filter(
      PreloadManager.blockingFileFilter
    );

    log(
      `Caching URL (${resourceFiles.length}): ${resourceFiles
        .map((x) => `${x.label} (${x.id.substring(0, 5)})`)
        .join(', ')}`
    );
    const tasks = resourceFiles
      .map((x) => episodeData.resources.getResourceById(x.id))
      .filter(isNotNullable);

    await allSettled(tasks);

    performance.mark('cacheResourceFileUrl-end');
    log('URL cache finished');
    performance.measure(
      'cacheResourceFileUrl',
      'cacheResourceFileUrl-start',
      'cacheResourceFileUrl-end'
    );

    this.urlCached.set(true);
  };

  private fetchSingleFile = (
    resource: IResourceFileForClient,
    taskQueue: TimeSlicingQueue = this.core.fastTaskQueue,
    reason = 'unknown'
  ) => {
    const episodeData = this.ensureEpisodeData();
    return episodeData.resources.getResourceById<
      string,
      PostProcessCallback<string, unknown>
    >(resource.id, null, undefined, (url) => {
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

      taskQueue.add(task, `fetch-resource:${reason}:${resource.label}`);

      return task.promise;
    });
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

    performance.mark('fetchBlockingResources-start');

    this.blockingResourceCacheScheduled.set(true);

    const episodeData = this.ensureEpisodeData();
    const resourceFiles = [...episodeData.resources.resourceFiles];

    const blockingResources = resourceFiles.filter(
      PreloadManager.blockingFileFilter
    );

    log(
      `Blocking resources (${blockingResources.length}): ${blockingResources
        .map((x) => `${x.label} (${x.id.substring(0, 5)})`)
        .join(', ')}`
    );
    const tasks = resourceFiles
      .filter(PreloadManager.blockingFileFilter)
      .map((x) => this.fetchSingleFile(x, this.core.fastTaskQueue, 'blocking'))
      .filter(isNotNullable);

    await allSettled(tasks);

    performance.mark('fetchBlockingResources-end');
    log('Blocking resources finished');
    performance.measure(
      'fetchBlockingResources',
      'fetchBlockingResources-start',
      'fetchBlockingResources-end'
    );
    this.blockingResourceCached.set(true);
  };

  fetchNonBlockingResources = async () => {
    if (this.nonBlockingResourceCacheScheduled.get()) {
      return;
    }

    this.nonBlockingResourceCacheScheduled.set(true);

    const episodeData = this.ensureEpisodeData();

    const resourceFiles = [...episodeData.resources.resourceFiles];

    const tasks = resourceFiles
      .filter(PreloadManager.nonBlockingFileFilter)
      .map((x) =>
        this.fetchSingleFile(x, this.core.slowTaskQueue, 'non-blocking')
      )
      .filter(isNotNullable);

    await allSettled(tasks);

    log('Non-blocking resources finished');
    this.nonBlockingResourceCached.set(true);
  };
}
