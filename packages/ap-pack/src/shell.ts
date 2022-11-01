import debug from 'debug';
import { ManagedAp } from '@recative/ap-manager';
import { LoadApRequestEvent } from '@recative/ap-manager/src';

const log = debug('ap-pack:shell');

interface IApMetadata {
  firstLevelPath: string;
  secondLevelPath: string;
}

(async () => {
  const apMetadata: IApMetadata = {
    firstLevelPath: '',
    secondLevelPath: '',
  };

  let apLoaded = false;

  log('Initializing the shell');

  const manager = new ManagedAp();

  const handleLoadApRequest = (
    async ({ detail }: LoadApRequestEvent) => {
      if (apLoaded) return;

      apLoaded = true;
      log(`Received ap loading request: '${detail.firstLevelPath}/${detail.secondLevelPath}'`);

      apMetadata.firstLevelPath = detail.firstLevelPath;
      apMetadata.secondLevelPath = detail.secondLevelPath;

      try {
        const importRequest = await import(
          // eslint-disable-next-line prefer-template
          'src/episodes/' + detail.firstLevelPath + '/' + detail.secondLevelPath + '/index.ts'
        );

        log('Resolved import request', importRequest);
      } catch (error) {
        log('Request error', error);
      }
    }) as unknown as EventListener;

  manager.addEventListener('load-ap-request', handleLoadApRequest);

  let constantsLoaded = false;
  let serviceWorkerLoaded = false;

  let readyForUse = false;

  const stateCheckup = async () => {
    log(
      'State checkup, serviceWorkerLoaded:',
      serviceWorkerLoaded,
      'constantsLoaded:',
      constantsLoaded,
      'readyForUse:',
      readyForUse
    );

    if (constantsLoaded && serviceWorkerLoaded && !readyForUse) {
      log('Marking ap as ready');
      readyForUse = true;

      await manager.connector.ready();

      // @ts-ignore
      // import('src/Catalog/p1/index.ts');
    }
  }

  const loadConstants = async () => {
    const data = await manager.connector.getConstants();

    Reflect.set(window, 'constant', data);

    if (typeof data === 'object' && data !== null) {
      if (
        typeof data.localStorage === 'object'
        && data.localStorage !== null
      ) {
        const storage = data.localStorage as Record<string, string>;

        Object.keys(storage).forEach((key) => {
          localStorage.setItem(key, storage[key]);
        });
      }
    }

    constantsLoaded = true;

    log('Got constants', data);

    await stateCheckup();
  }

  if (
    'serviceWorker' in navigator
    && localStorage.getItem('@recative/ap-pack/experimental-sw')
  ) {
    log('Initializing experimental service worker support');
    await new Promise((resolve) => {
      window.addEventListener('load', async () => {
        resolve(0);
      })
    });

    await loadConstants();

    const root = window.location.pathname.split('/');
    root.pop();

    try {
      const register = await navigator.serviceWorker
        .register(
          'sw.js',
          { scope: window.location.origin + root.join('/') }
        );

      await register.update();

      await manager.connector.serviceWorkerRegistered();
      serviceWorkerLoaded = true;
      stateCheckup();

    } catch (error) {
      log('Unable to load the service worker, because the following error: ', error);
      log('Will use fallback mode, resource preload and caching feature will not work');

      if (error instanceof Error) {
        manager.connector.serviceWorkerRegisterError(
          error.name,
          error.message,
          error.stack
        );
      } else {
        const internalError = new Error(String(error));
        manager.connector.serviceWorkerRegisterError(
          internalError.name,
          internalError.message,
          internalError.stack
        );
      }

      serviceWorkerLoaded = true;
      stateCheckup();
    }
  } else {
    log('Initializing the system without the service worker support');
    await loadConstants();
    serviceWorkerLoaded = true;
    stateCheckup();
  }
})();
