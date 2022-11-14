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
import { WebSocketMessageChannel } from 'async-call-rpc/utils/web/websocket.client.js'
import { Msgpack_Serialization } from 'async-call-rpc/utils/node/msgpack.js'

// import { AsyncCall } from 'async-call-rpc'
// import * as server from "./native/electron"
// import * as MessagePack from '@msgpack/msgpack'
// const client = AsyncCall<typeof server>({}, { channel: new WebSocketMessageChannel('ws://localhost:12219'), serializer: Msgpack_Serialization(MessagePack) })

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
