import { ManagedAp } from '@recative/ap-manager';

(() => {
  const manager = new ManagedAp((firstLevelPath, secondLevelPath) => {
    import(`src/episodes/${firstLevelPath}/${secondLevelPath}/index.ts`);
  });

  let constantsLoaded = false;
  let serviceWorkerLoaded = false;

  let readyForUse = false;

  const stateCheckup = () => {
    if (constantsLoaded && serviceWorkerLoaded && !readyForUse) {
      readyForUse = true;
      manager.connector.ready();
    }
  }

  const loadConstants = () => manager.connector.getConstants()
    .then((data: Record<string, unknown>) => {
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
    });

  loadConstants();

  if (
    'serviceWorker' in navigator
    && localStorage.getItem('@recative/ap-pack/experimental-sw')
  ) {
    window.addEventListener('load', () => {
      const root = window.location.pathname.split('/');
      root.pop();

      navigator.serviceWorker
        .register(
          'sw.js',
          { scope: window.location.origin + root.join('/') }
        )
        .then((register) => register.update())
        .then(() => manager.connector.serviceWorkerRegistered())
        .then(() => {
          serviceWorkerLoaded = true;
          stateCheckup();
        })
        .catch((error) => {
          console.error('Unable to load the service worker, because the following error: ', error);
          console.warn('Will use fallback mode, resource preload and caching feature will not work');

          if (error instanceof Error) {
            manager.connector.serviceWorkerRegisterError(
              error.name,
              error.message,
              error.stack
            );
          } else {
            const internalError = new Error(error);
            manager.connector.serviceWorkerRegisterError(
              internalError.name,
              internalError.message,
              internalError.stack
            );
          }

          serviceWorkerLoaded = true;
          stateCheckup();
        });
    });
  } else {
    serviceWorkerLoaded = true;
    stateCheckup();
  }
})();
