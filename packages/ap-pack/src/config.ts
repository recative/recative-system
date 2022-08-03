import path from 'path';
import os from 'os';
import fs from 'fs-extra';

import { Configuration, ProgressPlugin } from 'webpack';

import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';
import type { EntryObject } from 'webpack';

import { avRule } from './rules/av';
import { tsRule } from './rules/ts';
import { cssRule } from './rules/css';
import { tsxRule } from './rules/tsx';
import { fontRule } from './rules/font';
import { htmlRule } from './rules/html';
import { basisRule } from './rules/basis';
import { imageRule } from './rules/image';

import { envPlugin } from './plugins/env';
import { copyPlugin } from './plugins/copy';
import { htmlPlugin } from './plugins/html';

import { getProjectMetadata } from './utils';
import type { Logger } from './types';

// TODO: more generic config
export const getConfig = (
  mode: 'development' | 'production',
  server: boolean,
  logError: Logger = console.error,
): Configuration => {
  const entry: EntryObject = {};

  const production = mode === 'production';
  const root = process.cwd();

  const metadata = getProjectMetadata(logError);

  if (metadata.index !== undefined) {
    entry.dev = metadata.index;
  }

  metadata.episodeMetadata.forEach(({ path: entryPath }, name) => {
    entry[name] = entryPath;
  });

  return {
    mode,
    entry,
    devtool: production ? false : 'inline-source-map',
    module: {
      rules: [
        ...tsRule,
        ...avRule,
        ...cssRule,
        ...fontRule,
        ...htmlRule,
        ...basisRule,
        ...imageRule,
        ...tsxRule(production),
      ],
    },
    plugins: [
      ...envPlugin,
      ...copyPlugin,
      ...htmlPlugin(production, metadata),
      new ProgressPlugin(),
      new CleanWebpackPlugin(),
      new NodePolyfillPlugin(),
      new WebpackManifestPlugin({}),
    ],
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          defaultVendors: {
            filename: production
              ? 'vendors/[contenthash].vendor.js'
              : '[chunkhash].vendor.js',
          },
        },
      },
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.json', '.fnt', '.ttf'],
      modules: [path.resolve(root, 'src'), path.resolve(root, 'node_modules')],
    },
    output: {
      filename: production ? 'js/[name]/index.js' : '[name]/index.js',
      path: server ? fs.mkdtempSync(path.resolve(os.tmpdir(), 'ap-pack-')) : path.resolve(root, 'dist'),
      publicPath: '/',
    },
  };
};
