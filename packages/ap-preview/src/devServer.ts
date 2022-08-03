import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs-extra';
import { Parcel } from '@parcel/core';

const BASE_PATH = join(homedir(), '.ap-studio');
const CERT_PATH = join(BASE_PATH, 'cert');
const KEY_PATH = join(BASE_PATH, 'privkey');

const certValid = existsSync(CERT_PATH) && existsSync(KEY_PATH);

if (certValid) {
  console.log('🎉 Found a SSL Cert, resource server will use it!');
}

const bundler = new Parcel({
  entries: './example/index.html',
  defaultConfig: '@parcel/config-default',
  shouldDisableCache: true,
  shouldPatchConsole: true,
  serveOptions: {
    host: '0.0.0.0',
    port: 1234,
    https: certValid && {
      key: KEY_PATH,
      cert: CERT_PATH,
    },
  },
  hmrOptions: {
    host: '0.0.0.0',
    port: 1234,
  },
});

bundler.watch((err, event) => {
  if (err) {
    // fatal error
    throw err;
  }

  if (!event) return;

  if (event.type === 'buildSuccess') {
    const bundles = event.bundleGraph.getBundles();
    console.log(`✨ Built ${bundles.length} bundles in ${event.buildTime}ms!`);
  } else if (event.type === 'buildFailure') {
    console.log(`💀 Build Failed ${event.diagnostics[0].message}`);
    console.log(event.diagnostics[0].stack);
  }
});

bundler.watch();
