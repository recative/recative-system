import * as ReactDOM from 'react-dom/client';

import { HashRouter } from 'react-router-dom';
import { Client as Styletron } from 'styletron-engine-monolithic';
import { DarkTheme, BaseProvider } from 'baseui';
import { Provider as StyletronProvider } from 'styletron-react';

import { PlayerSdkProvider } from '@recative/client-sdk';

import {
  pathPattern,
  dataType,
} from './app/constants/configurations';

import App from './app/app';

const engine = new Styletron();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <HashRouter>
    <PlayerSdkProvider
      pathPattern={pathPattern}
      dataType={dataType}
    >
      <StyletronProvider value={engine}>
        <BaseProvider theme={DarkTheme}>
          <App />
        </BaseProvider>
      </StyletronProvider>
    </PlayerSdkProvider>
  </HashRouter>,
);
