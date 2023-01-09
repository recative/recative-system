import './app/utils/wdyr';
import './app/utils/globalThis';

import debug from 'debug';
import ReactDOM from 'react-dom';
import VConsole from 'vconsole';

import { IonApp } from '@ionic/react';
import { HashRouter } from 'react-router-dom';
import { Client as Styletron } from 'styletron-engine-monolithic';
import { DarkTheme, BaseProvider } from 'baseui';
import { Provider as StyletronProvider } from 'styletron-react';

import { ScreenOrientation } from '@awesome-cordova-plugins/screen-orientation';
import { AndroidFullScreen } from '@awesome-cordova-plugins/android-full-screen';

import { PlayerSdkProvider } from '@recative/client-sdk';

import { CONSOLE, WAIT_FOR_GLOBAL_EVENT } from './app/constants/storageKeys';
import {
  dataType,
  pathPattern,
  temporaryPath,
  temporaryDataType
} from './app/constants/configurations';
import App from './app/app';

import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const log = debug('mobile-shell:index');

const engine = new Styletron();

if (localStorage.getItem(CONSOLE)) {
  new VConsole({ theme: 'dark' });
  console.log('vConsole initialized!');
}

if (temporaryPath) {
  console.log('Will replace `temporaryPath` to', temporaryPath);
}

if (temporaryDataType) {
  console.log('Will replace `dataType` to', temporaryDataType);
}

ScreenOrientation.lock('landscape');

document.addEventListener('deviceready', async () => {
  log(`Waiting for immersive mode result...`);

  const supportImmersiveMode = await AndroidFullScreen.isImmersiveModeSupported();

  log(`supportImmersiveMode: ${supportImmersiveMode}`);

  if (supportImmersiveMode) {
    AndroidFullScreen.immersiveMode();
  }
}, false);

fetch('/constants.json')
  .then((response) => response.json())
  .then((data) => {
    Reflect.set(window, 'constant', data);

    if (typeof data === 'object' && data !== null) {
      if (typeof data.localStorage === 'object' && data.localStorage !== null) {
        Object.keys(data.localStorage).forEach((key) => {
          localStorage.setItem(key, data.localStorage[key]);
        });
      }
    }
  }).then(() => {
    return new Promise<void>((resolve) => {
      const eventName = localStorage.getItem(WAIT_FOR_GLOBAL_EVENT);

      if (!eventName) return resolve();

      window.addEventListener(eventName, () => {
        resolve();
      });
    });
  })
  .finally(() => {
    ReactDOM.render(
      <StyletronProvider value={engine}>
        <IonApp>
          <BaseProvider theme={DarkTheme}>
            <HashRouter>
              <PlayerSdkProvider
                pathPattern={pathPattern}
                dataType={dataType}
              >
                <App />
              </PlayerSdkProvider>
            </HashRouter>
          </BaseProvider>
        </IonApp>
      </StyletronProvider>,
      document.getElementById('root')
    );
  });

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.unregister();

