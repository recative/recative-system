import * as ReactDOM from 'react-dom/client';

import { HashRouter } from 'react-router-dom';
import { Client as Styletron } from 'styletron-engine-monolithic';
import { DarkTheme, BaseProvider } from 'baseui';
import { Provider as StyletronProvider } from 'styletron-react';

import { PlayerSdkProvider } from '@recative/client-sdk';

import {
  pathPattern,
  dataType,
} from './render/constants/configurations';

import App from './render/app';

const engine = new Styletron();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

fetch(`/constants.json`)
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
  })
  .then(() => fetch(`/version.txt`))
  .then((response) => response.text())
  .then((data) => {
    Reflect.set(window, 'version', data);
  })
  .finally(() => {
    root.render(
      <StyletronProvider value={engine}>
        <BaseProvider theme={DarkTheme}>
          <HashRouter>
            <PlayerSdkProvider
              pathPattern={pathPattern}
              dataType={dataType}
            >
              <App />
            </PlayerSdkProvider>
          </HashRouter>,
        </BaseProvider>
      </StyletronProvider>
    );
  });
