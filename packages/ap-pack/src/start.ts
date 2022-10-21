import os from 'os';
import path from 'path';
import nativeFs from 'fs';

import fs from 'fs-extra';
import mkdirp from 'mkdirp';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';

import { getConfig } from './config';

import type { Logger } from './types';

const nativeWebpackFs = {
  ...nativeFs,
  join: path.join.bind(path),
  mkdirp: mkdirp.bind(mkdirp) as any,
};

export const start = (
  logInfo: Logger = console.log,
  logError: Logger = console.error,
) => {
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const compiler = webpack(getConfig(mode, true));
  const BASE_PATH = path.join(os.homedir(), '.ap-studio');
  const CERT_PATH = path.join(BASE_PATH, 'cert');
  const KEY_PATH = path.join(BASE_PATH, 'privkey');

  const certValid = fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH);

  if (certValid) {
    logInfo('🎉 Found a SSL Cert, dev server will use it!');
  }
  const serverConfig: WebpackDevServer.Configuration = {
    port: 9000,
    server: {
      type: certValid ? 'https' : 'http',
      options: certValid
        ? {
          key: KEY_PATH,
          cert: CERT_PATH,
        }
        : undefined,
    },
    static: `${__dirname}/dist/`,
    allowedHosts: 'all',
    // Enable cors
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
    },
    devMiddleware: {
      writeToDisk: false,
      outputFileSystem: nativeWebpackFs,
    },
    client: {
      overlay: {
        errors: true,
        warnings: process.env.SHOW_WARNING_OVERLAY === 'true',
      },
    },
  };
  const devServer = new WebpackDevServer(serverConfig, compiler);
  devServer.startCallback((err) => {
    if (err && err.message) {
      logError(err);
      process.exit(1);
    }
    ['SIGINT', 'SIGTERM'].forEach((sig) => {
      process.on(sig, () => {
        devServer.close();
        process.exit();
      });
    });
    process.stdin.on('end', () => {
      devServer.close();
      process.exit();
    });
  });

  return devServer;
};
