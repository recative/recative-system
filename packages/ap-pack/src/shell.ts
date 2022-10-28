import debug from 'debug';
import { ManagedAp } from '@recative/ap-manager';

const log = debug('ap-pack:shell');

(() => {
  log('Initializing the shell');

  const manager = new ManagedAp(async (firstLevelPath, secondLevelPath) => {
    log(`Received ap loading request: '${firstLevelPath}/${secondLevelPath}'`);

    const importRequest = import(
      // eslint-disable-next-line prefer-template
      'src/episodes/' + firstLevelPath + '/' + secondLevelPath + '/index.ts'
    )

    log(`Request generated:`, importRequest);

    try {
      const module = await importRequest;
      log(`Imported: '${firstLevelPath}/${secondLevelPath}'`, module);
    } catch (error) {
      log(`Failed to import: '${firstLevelPath}/${secondLevelPath}'`, error);
    }

    return importRequest;
  });

  let constantsLoaded = false;
  let serviceWorkerLoaded = false;

  let readyForUse = false;

  const stateCheckup = () => {
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
      manager.connector.ready();
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
    stateCheckup();

    log('Got constants', data);
  }

  if (
    'serviceWorker' in navigator
    && localStorage.getItem('@recative/ap-pack/experimental-sw')
  ) {
    log('Initializing experimental service worker support');
    window.addEventListener('load', async () => {
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
    });
  } else {
    log('Initializing the system without the service worker support');
    loadConstants().then(() => {
      serviceWorkerLoaded = true;
      stateCheckup();
    });
  }
})();
